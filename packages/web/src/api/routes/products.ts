import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";
import type { Product, ProductDTO } from "../database/schema";
import { signGetUrl } from "../lib/s3";
import { ensureCategory } from "./categories";

// Converte um produto do banco em DTO com URLs prontas (capa + mídia assinadas)
async function serialize(product: Product): Promise<ProductDTO> {
  const [image, media] = await Promise.all([
    signGetUrl(product.image),
    Promise.all(
      (product.media ?? []).map(async (m) => ({
        type: m.type,
        key: m.key,
        url: await signGetUrl(m.key),
      })),
    ),
  ]);
  return { ...product, image, imageKey: product.image, media };
}

const mediaSchema = z.object({
  type: z.enum(["image", "video"]),
  key: z.string().min(1),
});

const colorSchema = z.object({ name: z.string().min(1), hex: z.string().min(1) });

const productInput = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  shortDescription: z.string().min(1),
  description: z.string().min(1),
  // Características / ficha técnica: uma por linha, "Nome: valor"
  specs: z.string().nullable().optional(),
  price: z.number().int().min(0).nullable().optional(),
  image: z.string().min(1),
  media: z.array(mediaSchema).default([]),
  colors: z.array(colorSchema).default([]),
  // null = estoque não controlado; 0 = esgotado
  stock: z.number().int().min(0).nullable().optional(),
  customizable: z.boolean().default(true),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const products = {
  // Catálogo público (apenas produtos ativos)
  list: base.handler(async () => {
    const rows = await db
      .select()
      .from(schema.products)
      .orderBy(asc(schema.products.sortOrder));
    return Promise.all(rows.filter((p) => p.active).map(serialize));
  }),

  // Lista completa para o admin (inclui inativos)
  listAll: adminBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.products)
      .orderBy(asc(schema.products.sortOrder));
    return Promise.all(rows.map(serialize));
  }),

  get: base.input(z.object({ slug: z.string() })).handler(async ({ input }) => {
    const [product] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, input.slug));
    if (!product) throw new ORPCError("NOT_FOUND", { message: "Produto não encontrado" });
    return serialize(product);
  }),

  // ----- Admin -----
  create: adminBase.input(productInput).handler(async ({ input }) => {
    const slug = slugify(input.slug || input.name);
    await ensureCategory(input.category);
    const [created] = await db
      .insert(schema.products)
      .values({ ...input, slug })
      .returning();
    return serialize(created);
  }),

  update: adminBase
    .input(productInput.partial().extend({ id: z.number().int() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const data = { ...rest };
      if (data.slug) data.slug = slugify(data.slug);
      if (data.category) await ensureCategory(data.category);
      const [updated] = await db
        .update(schema.products)
        .set(data)
        .where(eq(schema.products.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Produto não encontrado" });
      return serialize(updated);
    }),

  remove: adminBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input }) => {
      await db.delete(schema.products).where(eq(schema.products.id, input.id));
      return { ok: true as const };
    }),
};
