import { z } from "zod";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { base } from "../__core/app";
import { s3 } from "../lib/s3";

// Upload de foto/logo do cliente para gravação (armazenamento Tigris)
export const upload = {
  presign: base
    .input(z.object({ filename: z.string(), contentType: z.string() }))
    .handler(async ({ input }) => {
      const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `uploads/${Date.now()}-${safe}`;

      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          ContentType: input.contentType,
        }),
        { expiresIn: 600 },
      );

      // URL pública (assinada) para visualizar o arquivo depois
      const viewUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
        { expiresIn: 60 * 60 * 24 * 7 },
      );

      return { uploadUrl, viewUrl, key };
    }),
};
