import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";
import type { Banner, BannerDTO, BannerMedia, BannerMediaDTO } from "../database/schema";
import { signGetUrl } from "../lib/s3";

// Lê o JSON da coluna `media`, ignorando conteúdo inválido.
function parseMedia(raw: string | null): BannerMedia[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is BannerMedia =>
          !!m &&
          typeof m.key === "string" &&
          m.key.length > 0 &&
          (m.kind === "image" || m.kind === "video"),
      )
      .map((m) => ({ kind: m.kind, key: m.key }));
  } catch {
    return [];
  }
}

async function serialize(item: Banner): Promise<BannerDTO> {
  const items = parseMedia(item.media);
  // A imagem antiga (coluna `image`) continua valendo como primeira mídia.
  if (item.image && !items.some((m) => m.key === item.image)) {
    items.unshift({ kind: "image", key: item.image });
  }
  const mediaList: BannerMediaDTO[] = await Promise.all(
    items.map(async (m) => ({ ...m, url: await signGetUrl(m.key) })),
  );
  const firstImage = mediaList.find((m) => m.kind === "image");
  return {
    ...item,
    imageKey: item.image,
    url: item.image ? await signGetUrl(item.image) : (firstImage?.url ?? null),
    mediaList,
  };
}

const mediaInput = z
  .array(z.object({ kind: z.enum(["image", "video"]), key: z.string().min(1) }))
  .nullable()
  .optional();

const input = z.object({
  image: z.string().nullable().optional(),
  media: mediaInput,
  badge: z.string().nullable().optional(),
  title: z.string().min(1),
  text: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaUrl: z.string().nullable().optional(),
  whatsappMessage: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const banners = {
  // Banners públicos (somente ativos)
  list: base.handler(async () => {
    const rows = await db
      .select()
      .from(schema.banners)
      .orderBy(asc(schema.banners.sortOrder), asc(schema.banners.id));
    return Promise.all(rows.filter((r) => r.active).map(serialize));
  }),

  listAll: adminBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.banners)
      .orderBy(asc(schema.banners.sortOrder), asc(schema.banners.id));
    return Promise.all(rows.map(serialize));
  }),

  create: adminBase.input(input).handler(async ({ input }) => {
    const { media, ...rest } = input;
    const [created] = await db
      .insert(schema.banners)
      .values({ ...rest, media: media ? JSON.stringify(media) : null })
      .returning();
    return serialize(created);
  }),

  update: adminBase
    .input(input.partial().extend({ id: z.number().int() }))
    .handler(async ({ input }) => {
      const { id, media, ...others } = input;
      const rest = {
        ...others,
        ...(media === undefined ? {} : { media: media ? JSON.stringify(media) : null }),
      };
      const [updated] = await db
        .update(schema.banners)
        .set(rest)
        .where(eq(schema.banners.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Banner não encontrado" });
      return serialize(updated);
    }),

  remove: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.banners).where(eq(schema.banners.id, input.id));
    return { ok: true as const };
  }),
};
