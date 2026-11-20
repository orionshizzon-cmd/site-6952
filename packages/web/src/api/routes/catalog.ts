import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";
import type {
  CatalogMarketPrice,
  CatalogProduct,
  CatalogProductDTO,
  CatalogSettings,
} from "../database/schema";
import { computeMath, scoreProduct, DEFAULT_SETTINGS } from "../lib/catalog-math";
import type { CostSettings } from "../lib/catalog-math";
import { extractCatalog } from "../lib/catalog-extract";
import { searchMarketPrices } from "../lib/catalog-search";
import { signGetUrl } from "../lib/s3";

// Converte reais (número do catálogo) em centavos
function toCents(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Lê a configuração de custos (cria a linha padrão na primeira vez). */
async function getSettings(): Promise<CatalogSettings> {
  const [row] = await db.select().from(schema.catalogSettings).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(schema.catalogSettings)
    .values({ ...DEFAULT_SETTINGS })
    .returning();
  return created;
}

function costsOf(s: CatalogSettings): CostSettings {
  return {
    freightPct: s.freightPct,
    taxPct: s.taxPct,
    otherPct: s.otherPct,
    packagingCost: s.packagingCost,
    marginPct: s.marginPct,
    markupPct: s.markupPct,
  };
}

function withMath(
  product: CatalogProduct,
  sources: CatalogMarketPrice[],
  costs: CostSettings,
): CatalogProductDTO {
  return { ...product, math: computeMath(product, sources, costs), sources };
}

/** Recalcula min/média/máx de mercado de um produto a partir das fontes salvas. */
async function refreshMarketAggregates(productId: number) {
  const sources = await db
    .select()
    .from(schema.catalogMarketPrices)
    .where(eq(schema.catalogMarketPrices.productId, productId));
  const values = sources
    .filter((s) => s.matchType !== "diferente")
    .map((s) => s.promoPrice ?? s.price);
  await db
    .update(schema.catalogProducts)
    .set({
      marketMin: values.length ? Math.min(...values) : null,
      marketMax: values.length ? Math.max(...values) : null,
      marketAvg: values.length
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : null,
      marketCheckedAt: new Date(),
    })
    .where(eq(schema.catalogProducts.id, productId));
}

/** Recalcula nota e recomendação de todos os produtos de um catálogo. */
async function rescoreCatalog(catalogId: number, costs: CostSettings) {
  const products = await db
    .select()
    .from(schema.catalogProducts)
    .where(eq(schema.catalogProducts.catalogId, catalogId));
  const ids = products.map((p) => p.id);
  const prices = ids.length
    ? await db
        .select()
        .from(schema.catalogMarketPrices)
        .where(inArray(schema.catalogMarketPrices.productId, ids))
    : [];
  for (const p of products) {
    const sources = prices.filter((s) => s.productId === p.id);
    const math = computeMath(p, sources, costs);
    const { score, recommendation, reason } = scoreProduct(p, math);
    await db
      .update(schema.catalogProducts)
      .set({ score, recommendation, reason })
      .where(eq(schema.catalogProducts.id, p.id));
  }
}

/** Roda a extração por IA em segundo plano e grava os produtos encontrados. */
async function runAnalysis(catalogId: number) {
  const [file] = await db
    .select()
    .from(schema.catalogFiles)
    .where(eq(schema.catalogFiles.id, catalogId));
  if (!file) return;

  try {
    await db
      .update(schema.catalogFiles)
      .set({ status: "analisando", error: null })
      .where(eq(schema.catalogFiles.id, catalogId));

    const { products, pages } = await extractCatalog(file.fileKey, file.mimeType);

    // Substitui a análise anterior deste catálogo
    const old = await db
      .select({ id: schema.catalogProducts.id })
      .from(schema.catalogProducts)
      .where(eq(schema.catalogProducts.catalogId, catalogId));
    if (old.length) {
      await db.delete(schema.catalogMarketPrices).where(
        inArray(
          schema.catalogMarketPrices.productId,
          old.map((o) => o.id),
        ),
      );
      await db.delete(schema.catalogProducts).where(eq(schema.catalogProducts.catalogId, catalogId));
    }

    const settings = await getSettings();
    const costs = costsOf(settings);

    for (const p of products) {
      const row = {
        catalogId,
        code: p.code,
        name: p.name,
        description: p.description,
        category: p.category,
        unitPrice: toCents(p.unitPriceBrl),
        boxQty: p.boxQty ?? null,
        boxPrice:
          toCents(p.boxPriceBrl) ??
          (toCents(p.unitPriceBrl) != null && p.boxQty
            ? toCents(p.unitPriceBrl)! * p.boxQty
            : null),
        features: p.features,
        specs: p.specs,
        dimensions: p.dimensions,
        colors: p.colors,
        material: p.material,
        brand: p.brand,
        sourcePage: p.sourcePage,
        personalizable: p.personalizable,
        laserNote: p.laserNote,
        marketAvg: null as number | null,
      };
      const math = computeMath(row, [], costs);
      const { score, recommendation, reason } = scoreProduct(row, math);
      await db.insert(schema.catalogProducts).values({ ...row, score, recommendation, reason });
    }

    await db
      .update(schema.catalogFiles)
      .set({
        status: "pronto",
        pages: pages || file.pages,
        productCount: products.length,
        analyzedAt: new Date(),
        error: products.length === 0 ? "Nenhum produto identificado no arquivo." : null,
      })
      .where(eq(schema.catalogFiles.id, catalogId));
  } catch (error) {
    await db
      .update(schema.catalogFiles)
      .set({ status: "erro", error: error instanceof Error ? error.message : String(error) })
      .where(eq(schema.catalogFiles.id, catalogId));
  }
}

const marketInput = z.object({
  productId: z.number().int(),
  store: z.string().min(1),
  productName: z.string().nullable().optional(),
  priceBrl: z.number(),
  promoPriceBrl: z.number().nullable().optional(),
  availability: z.string().nullable().optional(),
  shipping: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  matchType: z.enum(["exato", "equivalente", "diferente"]).default("equivalente"),
});

export const catalog = {
  // ---------- Configuração de custos ----------
  settings: adminBase.handler(() => getSettings()),

  saveSettings: adminBase
    .input(
      z.object({
        freightPct: z.number().int().min(0).max(100),
        taxPct: z.number().int().min(0).max(100),
        otherPct: z.number().int().min(0).max(100),
        packagingCost: z.number().int().min(0),
        marginPct: z.number().int().min(0).max(95),
        markupPct: z.number().int().min(0).max(300),
      }),
    )
    .handler(async ({ input }) => {
      const current = await getSettings();
      const [updated] = await db
        .update(schema.catalogSettings)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(schema.catalogSettings.id, current.id))
        .returning();
      // Recalcula todos os catálogos com os novos custos
      const files = await db.select({ id: schema.catalogFiles.id }).from(schema.catalogFiles);
      for (const f of files) await rescoreCatalog(f.id, costsOf(updated));
      return updated;
    }),

  // ---------- Catálogos ----------
  catalogs: adminBase.handler(() =>
    db.select().from(schema.catalogFiles).orderBy(desc(schema.catalogFiles.createdAt)),
  ),

  createCatalog: adminBase
    .input(
      z.object({
        name: z.string().min(1),
        supplier: z.string().min(1),
        fileKey: z.string().min(1),
        mimeType: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db.insert(schema.catalogFiles).values(input).returning();
      // Análise roda em segundo plano; a interface acompanha pelo status
      void runAnalysis(created.id);
      return created;
    }),

  reanalyze: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    void runAnalysis(input.id);
    return { ok: true as const };
  }),

  deleteCatalog: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    const rows = await db
      .select({ id: schema.catalogProducts.id })
      .from(schema.catalogProducts)
      .where(eq(schema.catalogProducts.catalogId, input.id));
    if (rows.length) {
      await db.delete(schema.catalogMarketPrices).where(
        inArray(
          schema.catalogMarketPrices.productId,
          rows.map((r) => r.id),
        ),
      );
    }
    await db.delete(schema.catalogProducts).where(eq(schema.catalogProducts.catalogId, input.id));
    await db.delete(schema.catalogFiles).where(eq(schema.catalogFiles.id, input.id));
    return { ok: true as const };
  }),

  catalogFileUrl: adminBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input }) => {
      const [file] = await db
        .select()
        .from(schema.catalogFiles)
        .where(eq(schema.catalogFiles.id, input.id));
      if (!file) throw new ORPCError("NOT_FOUND", { message: "Catálogo não encontrado" });
      return { url: await signGetUrl(file.fileKey) };
    }),

  // ---------- Produtos analisados ----------
  products: adminBase
    .input(z.object({ catalogId: z.number().int().nullable().optional() }))
    .handler(async ({ input }): Promise<CatalogProductDTO[]> => {
      const settings = await getSettings();
      const costs = costsOf(settings);
      const rows = input.catalogId
        ? await db
            .select()
            .from(schema.catalogProducts)
            .where(eq(schema.catalogProducts.catalogId, input.catalogId))
            .orderBy(desc(schema.catalogProducts.score))
        : await db
            .select()
            .from(schema.catalogProducts)
            .orderBy(desc(schema.catalogProducts.score));
      const ids = rows.map((r) => r.id);
      const prices = ids.length
        ? await db
            .select()
            .from(schema.catalogMarketPrices)
            .where(inArray(schema.catalogMarketPrices.productId, ids))
        : [];
      return rows.map((r) =>
        withMath(
          r,
          prices.filter((p) => p.productId === r.id),
          costs,
        ),
      );
    }),

  updateProduct: adminBase
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).optional(),
        code: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        unitPrice: z.number().int().nullable().optional(),
        boxQty: z.number().int().nullable().optional(),
        boxPrice: z.number().int().nullable().optional(),
        material: z.string().nullable().optional(),
        personalizable: z.enum(["excelente", "bom", "pouco", "nao"]).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [updated] = await db
        .update(schema.catalogProducts)
        .set(rest)
        .where(eq(schema.catalogProducts.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Produto não encontrado" });
      const settings = await getSettings();
      await rescoreCatalog(updated.catalogId, costsOf(settings));
      return { ok: true as const };
    }),

  deleteProduct: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.catalogMarketPrices).where(eq(schema.catalogMarketPrices.productId, input.id));
    await db.delete(schema.catalogProducts).where(eq(schema.catalogProducts.id, input.id));
    return { ok: true as const };
  }),

  // ---------- Preços de mercado ----------
  addMarketPrice: adminBase.input(marketInput).handler(async ({ input }) => {
    const [product] = await db
      .select()
      .from(schema.catalogProducts)
      .where(eq(schema.catalogProducts.id, input.productId));
    if (!product) throw new ORPCError("NOT_FOUND", { message: "Produto não encontrado" });

    await db.insert(schema.catalogMarketPrices).values({
      productId: input.productId,
      store: input.store,
      productName: input.productName ?? null,
      price: toCents(input.priceBrl)!,
      promoPrice: toCents(input.promoPriceBrl ?? null),
      availability: input.availability ?? null,
      shipping: input.shipping ?? null,
      url: input.url ?? null,
      matchType: input.matchType,
      source: "manual",
      searchedAt: new Date(),
    });

    await refreshMarketAggregates(input.productId);

    const settings = await getSettings();
    await rescoreCatalog(product.catalogId, costsOf(settings));
    return { ok: true as const };
  }),

  removeMarketPrice: adminBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input }) => {
      await db.delete(schema.catalogMarketPrices).where(eq(schema.catalogMarketPrices.id, input.id));
      return { ok: true as const };
    }),

  // ---------- Comparação entre catálogos (antigo x novo) ----------
  compareCatalogs: adminBase
    .input(z.object({ oldId: z.number().int(), newId: z.number().int() }))
    .handler(async ({ input }) => {
      const [oldRows, newRows] = await Promise.all([
        db
          .select()
          .from(schema.catalogProducts)
          .where(eq(schema.catalogProducts.catalogId, input.oldId)),
        db
          .select()
          .from(schema.catalogProducts)
          .where(eq(schema.catalogProducts.catalogId, input.newId)),
      ]);
      const keyOf = (p: CatalogProduct) =>
        (p.code?.trim() || p.name).toLowerCase().replace(/\s+/g, " ");
      const oldMap = new Map(oldRows.map((p) => [keyOf(p), p]));
      const newMap = new Map(newRows.map((p) => [keyOf(p), p]));

      const changes = newRows.map((p) => {
        const before = oldMap.get(keyOf(p));
        if (!before) return { status: "novo" as const, name: p.name, code: p.code, before: null, after: p.unitPrice };
        if (before.unitPrice == null || p.unitPrice == null)
          return { status: "igual" as const, name: p.name, code: p.code, before: before.unitPrice, after: p.unitPrice };
        const status =
          p.unitPrice > before.unitPrice
            ? ("subiu" as const)
            : p.unitPrice < before.unitPrice
              ? ("caiu" as const)
              : ("igual" as const);
        return { status, name: p.name, code: p.code, before: before.unitPrice, after: p.unitPrice };
      });

      const removed = oldRows
        .filter((p) => !newMap.has(keyOf(p)))
        .map((p) => ({
          status: "removido" as const,
          name: p.name,
          code: p.code,
          before: p.unitPrice,
          after: null,
        }));

      return [...changes, ...removed];
    }),

  // ---------- Comparação entre fornecedores ----------
  compareSuppliers: adminBase.handler(async () => {
    const settings = await getSettings();
    const costs = costsOf(settings);
    const files = await db.select().from(schema.catalogFiles);
    const rows = await db.select().from(schema.catalogProducts);
    const prices = await db.select().from(schema.catalogMarketPrices);
    const supplierOf = new Map(files.map((f) => [f.id, f.supplier]));

    const groups = new Map<
      string,
      { key: string; name: string; items: (CatalogProductDTO & { supplier: string })[] }
    >();
    for (const r of rows) {
      const key = (r.code?.trim() || r.name).toLowerCase().replace(/\s+/g, " ");
      const dto = withMath(
        r,
        prices.filter((p) => p.productId === r.id),
        costs,
      );
      const entry = groups.get(key) ?? { key, name: r.name, items: [] };
      entry.items.push({ ...dto, supplier: supplierOf.get(r.catalogId) ?? "—" });
      groups.set(key, entry);
    }
    return [...groups.values()].filter((g) => new Set(g.items.map((i) => i.supplier)).size > 1);
  }),

  // ---------- Relatório ----------
  report: adminBase
    .input(z.object({ catalogId: z.number().int() }))
    .handler(async ({ input }) => {
      const [file] = await db
        .select()
        .from(schema.catalogFiles)
        .where(eq(schema.catalogFiles.id, input.catalogId));
      if (!file) throw new ORPCError("NOT_FOUND", { message: "Catálogo não encontrado" });
      const settings = await getSettings();
      const costs = costsOf(settings);
      const rows = await db
        .select()
        .from(schema.catalogProducts)
        .where(eq(schema.catalogProducts.catalogId, input.catalogId))
        .orderBy(desc(schema.catalogProducts.score));
      const ids = rows.map((r) => r.id);
      const prices = ids.length
        ? await db
            .select()
            .from(schema.catalogMarketPrices)
            .where(inArray(schema.catalogMarketPrices.productId, ids))
        : [];
      const items = rows.map((r) =>
        withMath(
          r,
          prices.filter((p) => p.productId === r.id),
          costs,
        ),
      );
      const sum = (list: (number | null)[]) =>
        list.reduce<number>((acc, v) => acc + (v ?? 0), 0);
      const recommended = items.filter((i) => i.recommendation === "comprar");
      return {
        file,
        settings,
        total: items.length,
        recommended: recommended.length,
        toTest: items.filter((i) => i.recommendation === "testar").length,
        rejected: items.filter((i) => i.recommendation === "nao").length,
        withMarket: items.filter((i) => i.sources.length > 0).length,
        investment: sum(recommended.map((i) => i.math.investment)),
        potentialRevenue: sum(recommended.map((i) => i.math.potentialRevenue)),
        potentialProfit: sum(recommended.map((i) => i.math.potentialProfit)),
        top20: items.slice(0, 20),
      };
    }),

  // ---------- Integração com o cadastro de Produtos ----------
  addToProducts: adminBase
    .input(
      z.object({
        id: z.number().int(),
        priceOverride: z.number().int().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [p] = await db
        .select()
        .from(schema.catalogProducts)
        .where(eq(schema.catalogProducts.id, input.id));
      if (!p) throw new ORPCError("NOT_FOUND", { message: "Produto não encontrado" });

      const settings = await getSettings();
      const costs = costsOf(settings);
      const math = computeMath(p, [], costs);

      const slugBase = p.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\̀-\ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const existing = await db
        .select({ slug: schema.products.slug })
        .from(schema.products)
        .where(eq(schema.products.slug, slugBase));
      const slug = existing.length ? `${slugBase}-${Date.now().toString().slice(-4)}` : slugBase;

      const category = p.category?.trim() || "Outros";
      const [cat] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.name, category));
      if (!cat) await db.insert(schema.categories).values({ name: category });

      const [created] = await db
        .insert(schema.products)
        .values({
          slug,
          name: p.name,
          category,
          shortDescription: (p.description || p.features || p.name).slice(0, 140),
          description: [p.description, p.features, p.specs, p.dimensions]
            .filter(Boolean)
            .join("\n\n") || p.name,
          price: input.priceOverride ?? math.suggestedPrice ?? null,
          image: "/images/logo.png",
          media: [],
          colors: [],
          stock: null,
          customizable: p.personalizable !== "nao",
          featured: false,
          active: false,
          sortOrder: 0,
        })
        .returning();
      return { ok: true as const, productId: created.id, slug: created.slug };
    }),

  // ---------- Simulador de compra ----------
  simulate: adminBase
    .input(
      z.object({
        catalogId: z.number().int().nullable().optional(),
        budget: z.number().int().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const settings = await getSettings();
      const costs = costsOf(settings);
      const rows = input.catalogId
        ? await db
            .select()
            .from(schema.catalogProducts)
            .where(eq(schema.catalogProducts.catalogId, input.catalogId))
            .orderBy(desc(schema.catalogProducts.score))
        : await db
            .select()
            .from(schema.catalogProducts)
            .orderBy(desc(schema.catalogProducts.score));

      let left = input.budget;
      const picks: {
        id: number;
        name: string;
        qty: number;
        unitCost: number;
        investment: number;
        suggestedPrice: number;
        revenue: number;
        profit: number;
        score: number;
      }[] = [];

      for (const r of rows) {
        if (left <= 0 || picks.length >= 12) break;
        const math = computeMath(r, [], costs);
        const unitCost = math.realUnitCost;
        const price = math.suggestedPrice;
        if (unitCost == null || price == null || unitCost <= 0) continue;
        if (r.recommendation === "nao") continue;
        // Diversifica: no máximo 35% do orçamento por produto,
        // mas sempre permite fechar pelo menos uma caixa se couber no que sobrou.
        const minQty = r.boxQty && r.boxQty > 0 ? r.boxQty : 1;
        const lotCost = unitCost * minQty;
        const cap = Math.max(lotCost, Math.round(input.budget * 0.35));
        const lots = Math.floor(Math.min(left, cap) / lotCost);
        if (lots < 1) continue;
        const qty = lots * minQty;
        const investment = qty * unitCost;
        left -= investment;
        picks.push({
          id: r.id,
          name: r.name,
          qty,
          unitCost,
          investment,
          suggestedPrice: price,
          revenue: qty * price,
          profit: qty * (price - unitCost),
          score: r.score,
        });
      }

      const investment = picks.reduce((a, p) => a + p.investment, 0);
      return {
        budget: input.budget,
        used: investment,
        left: input.budget - investment,
        revenue: picks.reduce((a, p) => a + p.revenue, 0),
        profit: picks.reduce((a, p) => a + p.profit, 0),
        picks,
      };
    }),

  // ---------- Busca automática de preços na internet ----------
  searchPrices: adminBase
    .input(z.object({ productId: z.number().int() }))
    .handler(async ({ input }) => {
      const [product] = await db
        .select()
        .from(schema.catalogProducts)
        .where(eq(schema.catalogProducts.id, input.productId));
      if (!product) throw new ORPCError("NOT_FOUND", { message: "Produto não encontrado" });

      const outcome = await searchMarketPrices(product);

      if (outcome.error) {
        return {
          ok: false as const,
          added: 0,
          notFound: outcome.notFoundStores,
          message:
            "Não consegui buscar os preços agora. Tente de novo em alguns minutos ou registre o preço manualmente.",
          detail: outcome.error,
        };
      }

      if (outcome.results.length === 0) {
        return {
          ok: true as const,
          added: 0,
          notFound: outcome.notFoundStores,
          message:
            outcome.note ??
            "A busca funcionou, mas nenhum anúncio confiável deste produto foi encontrado. Registre o preço manualmente abaixo.",
          detail: null,
        };
      }

      // Remove os resultados automáticos anteriores (os manuais são preservados)
      await db
        .delete(schema.catalogMarketPrices)
        .where(
          and(
            eq(schema.catalogMarketPrices.productId, input.productId),
            eq(schema.catalogMarketPrices.source, "auto"),
          ),
        );

      await db.insert(schema.catalogMarketPrices).values(
        outcome.results.map((r) => ({
          productId: input.productId,
          store: r.store,
          productName: r.productName,
          price: toCents(r.priceBrl)!,
          promoPrice: null,
          availability: r.availability,
          shipping: r.shipping,
          url: r.url,
          matchType: r.matchType,
          source: "auto",
          searchedAt: new Date(),
        })),
      );

      await refreshMarketAggregates(input.productId);
      const settings = await getSettings();
      await rescoreCatalog(product.catalogId, costsOf(settings));

      const parts = [`${outcome.results.length} anúncio(s) encontrado(s).`];
      if (outcome.notFoundStores.length)
        parts.push(`Sem resultado em: ${outcome.notFoundStores.join(", ")}.`);
      if (outcome.note) parts.push(outcome.note);

      return {
        ok: true as const,
        added: outcome.results.length,
        notFound: outcome.notFoundStores,
        message: parts.join(" "),
        detail: null,
      };
    }),

  // ---------- Alertas de oportunidade ----------
  opportunities: adminBase
    .input(z.object({ catalogId: z.number().int().nullable().optional() }))
    .handler(async ({ input }): Promise<CatalogProductDTO[]> => {
      const settings = await getSettings();
      const costs = costsOf(settings);
      const rows = input.catalogId
        ? await db
            .select()
            .from(schema.catalogProducts)
            .where(eq(schema.catalogProducts.catalogId, input.catalogId))
        : await db.select().from(schema.catalogProducts);
      const ids = rows.map((r) => r.id);
      const prices = ids.length
        ? await db
            .select()
            .from(schema.catalogMarketPrices)
            .where(inArray(schema.catalogMarketPrices.productId, ids))
        : [];
      return rows
        .map((r) =>
          withMath(
            r,
            prices.filter((p) => p.productId === r.id),
            costs,
          ),
        )
        .filter((r) => r.math.isOpportunity)
        .sort((a, b) => (b.math.opportunityPct ?? 0) - (a.math.opportunityPct ?? 0));
    }),

  // ---------- Fornecedores (estoque, frete, prazo) ----------
  suppliers: adminBase.handler(() =>
    db.select().from(schema.catalogSuppliers).orderBy(schema.catalogSuppliers.name),
  ),

  saveSupplier: adminBase
    .input(
      z.object({
        id: z.number().int().nullable().optional(),
        name: z.string().min(1),
        freightNote: z.string().nullable().optional(),
        freightCost: z.number().int().nullable().optional(),
        leadTimeDays: z.number().int().nullable().optional(),
        minOrderValue: z.number().int().nullable().optional(),
        stockNote: z.string().nullable().optional(),
        contact: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const values = {
        name: rest.name,
        freightNote: rest.freightNote ?? null,
        freightCost: rest.freightCost ?? null,
        leadTimeDays: rest.leadTimeDays ?? null,
        minOrderValue: rest.minOrderValue ?? null,
        stockNote: rest.stockNote ?? null,
        contact: rest.contact ?? null,
        notes: rest.notes ?? null,
        updatedAt: new Date(),
      };
      if (id) {
        await db
          .update(schema.catalogSuppliers)
          .set(values)
          .where(eq(schema.catalogSuppliers.id, id));
        return { ok: true as const };
      }
      const [existing] = await db
        .select()
        .from(schema.catalogSuppliers)
        .where(eq(schema.catalogSuppliers.name, values.name));
      if (existing) {
        await db
          .update(schema.catalogSuppliers)
          .set(values)
          .where(eq(schema.catalogSuppliers.id, existing.id));
        return { ok: true as const };
      }
      await db.insert(schema.catalogSuppliers).values(values);
      return { ok: true as const };
    }),

  deleteSupplier: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.catalogSuppliers).where(eq(schema.catalogSuppliers.id, input.id));
    return { ok: true as const };
  }),
};
