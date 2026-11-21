import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { s3 } from "./s3";

export const maxAttachments = 4;
const maxImageBytes = 8 * 1024 * 1024;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpegSignature = Buffer.from([0xff, 0xd8, 0xff]);

export class AttachmentError extends Error {}
export class BodyTooLargeError extends Error {}

export function isChatGptFileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "files.oaiusercontent.com" &&
      !url.port &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export async function readBoundedBody(
  body: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) throw new BodyTooLargeError();
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks, bytes);
}

async function downloadImage(url: string, deadline: AbortSignal): Promise<Buffer> {
  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.any([deadline, AbortSignal.timeout(10_000)]),
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new AttachmentError("Anexe novamente a foto e tente outra vez.");
    }

    return await readBoundedBody(response.body, maxImageBytes);
  } catch (error) {
    if (error instanceof AttachmentError) throw error;
    if (error instanceof BodyTooLargeError)
      throw new AttachmentError("Cada foto pode ter até 8 MiB.");
    throw new AttachmentError("Não foi possível obter a foto. Anexe o arquivo novamente.");
  }
}

function allowedImageSignature(bytes: Buffer): boolean {
  return (
    bytes.subarray(0, pngSignature.length).equals(pngSignature) ||
    bytes.subarray(0, jpegSignature.length).equals(jpegSignature) ||
    (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
  );
}

export async function storeChatGptPhotos(
  files: readonly { download_link: string }[],
): Promise<string[]> {
  const keys: string[] = [];
  const deadline = AbortSignal.timeout(30_000);
  for (const file of files) {
    const bytes = await downloadImage(file.download_link, deadline);
    if (!allowedImageSignature(bytes)) {
      throw new AttachmentError("Use fotos estáticas em JPEG, PNG ou WebP.");
    }
    let normalized: Buffer;
    try {
      const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: "warning" });
      const { format, pages } = await image.metadata();
      if ((format !== "jpeg" && format !== "png" && format !== "webp") || (pages ?? 1) > 1) {
        throw new AttachmentError("Use fotos estáticas em JPEG, PNG ou WebP.");
      }
      normalized = await image
        .autoOrient()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
    } catch (error) {
      if (error instanceof AttachmentError) throw error;
      throw new AttachmentError("A foto está inválida ou excede 25 megapixels.");
    }

    deadline.throwIfAborted();
    const key = `catalog/chatgpt/${randomUUID()}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: "image/webp",
        Body: normalized,
      }),
      { abortSignal: AbortSignal.any([deadline, AbortSignal.timeout(10_000)]) },
    );
    keys.push(key);
  }
  return keys;
}
