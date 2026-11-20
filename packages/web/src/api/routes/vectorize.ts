import { z } from "zod";
import { generateText } from "ai";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ORPCError } from "@orpc/server";
import { adminBase } from "../lib/admin-auth";
import { s3 } from "../lib/s3";
import { gateway } from "../agent/gateway";

// Prompts fixos definidos pela Rafa Laser
const PROMPTS = {
  compose:
    "crie uma arte profissional com essas imagens em anexo, unindo todas elas, fazendo algo bem artístico, bem completo, e preenchida, a arte deve medir 290mm de largura por 125 mm de altura (proporção widescreen ~21:9, horizontal), quero as imagens bem encaixadas ocupando todo o espaço, e a arte com fundo preto sólido.",
  engrave:
    "Transforme esta fotografia em uma ilustração de gravura (engraving) extremamente detalhada, mantendo 100% da identidade, expressão facial e proporções das pessoas. Utilize milhares de traços finos, hachuras cruzadas (cross-hatching), pontilhismo (stippling) e linhas de contorno precisas, inspiradas em gravuras clássicas e notas de banco. Produza um retrato em preto e branco de alto contraste, com iluminação dramática, riqueza de texturas na pele, cabelos e roupas. Remova completamente o fundo, substituindo-o por um fundo preto sólido. Preserve todos os pequenos detalhes da fotografia com aparência artística e hiper-realista. O resultado deve parecer uma gravura feita à mão por um mestre gravador, com definição extremamente alta, nitidez impecável e qualidade de impressão em 8K.",
} as const;

// Baixa os bytes de um objeto do bucket a partir da sua key
async function fetchImage(key: string): Promise<{ data: Uint8Array; mediaType: string }> {
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  const body = res.Body as { transformToByteArray: () => Promise<Uint8Array> };
  const data = await body.transformToByteArray();
  return { data, mediaType: res.ContentType || "image/png" };
}

export const vectorize = {
  generate: adminBase
    .input(
      z.object({
        mode: z.enum(["compose", "engrave"]),
        imageKeys: z.array(z.string()).min(1),
      }),
    )
    .handler(async ({ input }) => {
      if (input.mode === "engrave" && input.imageKeys.length !== 1) {
        throw new ORPCError("BAD_REQUEST", {
          message: "O modo Gravura usa exatamente uma imagem.",
        });
      }

      const images = await Promise.all(input.imageKeys.map((k) => fetchImage(k)));

      const result = await generateText({
        model: gateway("google/gemini-3-pro-image"),
        providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPTS[input.mode] },
              ...images.map((img) => ({
                type: "file" as const,
                data: img.data,
                mediaType: img.mediaType,
              })),
            ],
          },
        ],
      });

      const file = result.files?.find((f) => f.mediaType?.startsWith("image/"));
      if (!file) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "A IA não retornou uma imagem. Tente novamente.",
        });
      }

      const key = `vectorized/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: Buffer.from(file.uint8Array),
          ContentType: file.mediaType || "image/png",
        }),
      );

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
        { expiresIn: 60 * 60 * 24 * 7 },
      );

      return { url, key };
    }),
};
