import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";
import type { ImportedListing, ImportedListingDTO } from "../database/schema";
import { signGetUrl } from "../lib/s3";
import { importListingFromUrl, rewriteListingCopy } from "../lib/listing-import";
import { ensureCategory } from "./categories";

function toCents(brl: number | null | undefined): number | null {
  if (brl == null || !Number.isFinite(brl)) return null;
  return Math.round(brl * 100);
}

async function serialize(row: ImportedListing): Promise<ImportedListingDTO> {
  const images = await Promise.all(
    (row.images ?? []).map(async (img) => ({ ...img, url: await signGetUrl(img.key) })),
  );
  return { ...row, images };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || `produto-${Date.now().toString().slice(-6)}`;
  const existing = await db
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(eq(schema.products.slug, base));
  return existing.length ? `${base}-${Date.now().toString().slice(-4)}` : base;
}

const draftInput = z.object({
  id: z.number().int(),
  name: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  price: z.number().int().min(0).nullable().optional(),
  originalPrice: z.number().int().min(0).nullable().optional(),
  specs: z.string().nullable().optional(),
  colorsText: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  variationsText: z.string().nullable().optional(),
  sourceStock: z.number().int().min(0).nullable().optional(),
  coverIndex: z.number().int().min(0).optional(),
  images: z
    .array(
      z.object({
        key: z.string().min(1),
        source: z.string().nullable(),
        selected: z.boolean(),
      }),
    )
    .optional(),
});

export const listingImport = {
  // ---------- Rascunhos ----------
  list: adminBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.importedListings)
      .orderBy(desc(schema.importedListings.createdAt));
    return Promise.all(rows.map(serialize));
  }),

  get: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    const [row] = await db
      .select()
      .from(schema.importedListings)
      .where(eq(schema.importedListings.id, input.id));
    if (!row) throw new ORPCError("NOT_FOUND", { message: "Rascunho não encontrado" });
    return serialize(row);
  }),

  /** Copia o anúncio de uma URL e cria o rascunho para revisão. */
  importUrl: adminBase
    .input(z.object({ url: z.string().min(8) }))
    .handler(async ({ input }) => {
      const url = input.url.trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cole o endereço completo do anúncio, começando com https://",
        });
      }

      const outcome = await importListingFromUrl(url);

      if (!outcome.ok || !outcome.data) {
        const [created] = await db
          .insert(schema.importedListings)
          .values({
            url,
            store: outcome.store,
            status: "erro",
            name: "",
            shortDescription: "",
            description: "",
            images: [],
            warnings: outcome.warnings,
            error: outcome.error,
            marketplace: outcome.official?.marketplace ?? null,
            itemId: outcome.official?.itemId ?? null,
            diagnostics: outcome.diagnostics,
          })
          .returning();
        return { ok: false as const, listing: await serialize(created), error: outcome.error };
      }

      const d = outcome.data;
      const [created] = await db
        .insert(schema.importedListings)
        .values({
          url,
          store: outcome.store,
          status: "revisao",
          name: d.name.slice(0, 120),
          shortDescription: (d.shortDescription || d.name).slice(0, 160),
          description: d.description || d.shortDescription || d.name,
          category: d.category,
          brand: d.brand,
          price: toCents(d.priceBrl),
          originalPrice: toCents(d.originalPriceBrl),
          specs: d.specs,
          colorsText: d.colors,
          marketplace: outcome.official?.marketplace ?? null,
          itemId: outcome.official?.itemId ?? null,
          model: outcome.official?.model ?? null,
          variationsText: outcome.official?.variations.length
            ? outcome.official.variations.join("\n")
            : null,
          sourceStock: outcome.official?.stock ?? null,
          seller: outcome.official?.seller ?? null,
          diagnostics: outcome.diagnostics,
          images: outcome.images,
          coverIndex: 0,
          warnings: outcome.warnings,
          error: null,
        })
        .returning();
      return { ok: true as const, listing: await serialize(created), error: null };
    }),

  /** Salva as correções feitas pelo admin na conferência. */
  updateDraft: adminBase.input(draftInput).handler(async ({ input }) => {
    const { id, ...rest } = input;
    const [updated] = await db
      .update(schema.importedListings)
      .set(rest)
      .where(eq(schema.importedListings.id, id))
      .returning();
    if (!updated) throw new ORPCError("NOT_FOUND", { message: "Rascunho não encontrado" });
    return serialize(updated);
  }),

  /** "Gerar anúncio Rafa Laser": reescreve o texto com os dados já conferidos. */
  rewrite: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    const [row] = await db
      .select()
      .from(schema.importedListings)
      .where(eq(schema.importedListings.id, input.id));
    if (!row) throw new ORPCError("NOT_FOUND", { message: "Rascunho não encontrado" });

    const copy = await rewriteListingCopy({
      name: row.name,
      description: row.description,
      specs: row.specs,
      brand: row.brand,
      model: row.model,
      category: row.category,
      variations: row.variationsText,
      priceBrl: row.price != null ? row.price / 100 : null,
    });
    if (!copy) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "A IA não conseguiu gerar o anúncio agora. Tente novamente em alguns segundos.",
      });
    }

    const [updated] = await db
      .update(schema.importedListings)
      .set({
        name: copy.name.slice(0, 120),
        shortDescription: (copy.shortDescription || copy.name).slice(0, 160),
        description: copy.description || row.description,
        specs: copy.specs ?? row.specs,
      })
      .where(eq(schema.importedListings.id, input.id))
      .returning();
    return serialize(updated);
  }),

  /** Adiciona uma foto enviada pelo admin ao rascunho. */
  addImage: adminBase
    .input(z.object({ id: z.number().int(), key: z.string().min(1) }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(schema.importedListings)
        .where(eq(schema.importedListings.id, input.id));
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Rascunho não encontrado" });
      const images = [...(row.images ?? []), { key: input.key, source: null, selected: true }];
      const [updated] = await db
        .update(schema.importedListings)
        .set({ images })
        .where(eq(schema.importedListings.id, input.id))
        .returning();
      return serialize(updated);
    }),

  /** Remove uma foto do rascunho. */
  removeImage: adminBase
    .input(z.object({ id: z.number().int(), index: z.number().int().min(0) }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(schema.importedListings)
        .where(eq(schema.importedListings.id, input.id));
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Rascunho não encontrado" });
      const images = (row.images ?? []).filter((_, i) => i !== input.index);
      const cover = Math.min(row.coverIndex, Math.max(images.length - 1, 0));
      const [updated] = await db
        .update(schema.importedListings)
        .set({ images, coverIndex: cover })
        .where(eq(schema.importedListings.id, input.id))
        .returning();
      return serialize(updated);
    }),

  /** Aprova o rascunho e cadastra o produto no catálogo. */
  approve: adminBase
    .input(
      z.object({
        id: z.number().int(),
        /** Publicar já visível no site (false = fica oculto para ajustes). */
        active: z.boolean().default(true),
        customizable: z.boolean().default(true),
        featured: z.boolean().default(false),
        /** Estoque: null = sob encomenda. */
        stock: z.number().int().min(0).nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(schema.importedListings)
        .where(eq(schema.importedListings.id, input.id));
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Rascunho não encontrado" });
      if (row.productId) {
        throw new ORPCError("BAD_REQUEST", { message: "Este anúncio já foi aprovado." });
      }
      if (!row.name.trim()) {
        throw new ORPCError("BAD_REQUEST", { message: "Preencha o nome do produto antes de aprovar." });
      }

      const all = row.images ?? [];
      const selected = all.filter((img) => img.selected);
      if (!selected.length) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Escolha pelo menos uma foto (ou envie uma) antes de aprovar.",
        });
      }
      const coverCandidate = all[row.coverIndex];
      const cover = coverCandidate?.selected ? coverCandidate : selected[0];
      const rest = selected.filter((img) => img.key !== cover.key);

      const category = (row.category ?? "").trim() || "Outros";
      await ensureCategory(category);

      // A ficha técnica vai no campo próprio `specs` do produto (exibido em
      // blocos de características na vitrine e na página do produto), então a
      // descrição fica só com o texto corrido.
      const description = row.description.trim();

      const colors = (row.colorsText ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 12)
        .map((name) => ({ name, hex: "#111111" }));

      const [product] = await db
        .insert(schema.products)
        .values({
          slug: await uniqueSlug(row.name),
          name: row.name.trim(),
          category,
          shortDescription: (row.shortDescription || row.name).slice(0, 160),
          description: description || row.name,
          specs: row.specs?.trim() || null,
          price: row.price,
          image: cover.key,
          media: rest.map((img) => ({ type: "image" as const, key: img.key })),
          colors,
          stock: input.stock ?? null,
          customizable: input.customizable,
          featured: input.featured,
          active: input.active,
          sortOrder: 0,
        })
        .returning();

      await db
        .update(schema.importedListings)
        .set({ status: "aprovado", productId: product.id })
        .where(eq(schema.importedListings.id, input.id));

      return { ok: true as const, productId: product.id, slug: product.slug };
    }),

  remove: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.importedListings).where(eq(schema.importedListings.id, input.id));
    return { ok: true as const };
  }),
};
