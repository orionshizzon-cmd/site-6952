import { z } from "zod";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";
import type { DealAlert, DealOffer, DealOfferDTO, DealSettings } from "../database/schema";
import {
  DEFAULT_DEAL_SETTINGS,
  analyzeDeal,
  realCost,
  scenarios,
  type DealCosts,
} from "../lib/deal-math";
import { DEAL_SOURCES, searchDeals } from "../lib/deal-search";

function toCents(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function toBrl(cents: number | null | undefined): number | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  return cents / 100;
}

/** Lê a configuração do módulo (cria a linha padrão na primeira vez). */
async function getSettings(): Promise<DealSettings> {
  const [row] = await db.select().from(schema.dealSettings).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(schema.dealSettings)
    .values({ ...DEFAULT_DEAL_SETTINGS })
    .returning();
  return created;
}

function costsOf(s: DealSettings): DealCosts {
  return {
    enabledSources: s.enabledSources,
    maxResults: s.maxResults,
    defaultShipping: s.defaultShipping,
    packagingCost: s.packagingCost,
    taxPct: s.taxPct,
    otherPct: s.otherPct,
    quickMarginPct: s.quickMarginPct,
    normalMarginPct: s.normalMarginPct,
    premiumMarginPct: s.premiumMarginPct,
  };
}

function withScenarios(offer: DealOffer, costs: DealCosts): DealOfferDTO {
  const cost = offer.totalCost ?? realCost(offer.currentPrice, offer.shippingCost, costs);
  return { ...offer, realCost: cost, scenarios: scenarios(cost, costs) };
}

const SORTS = ["desconto", "preco", "lucro", "margem", "oportunidade"] as const;
type Sort = (typeof SORTS)[number];

function sortOffers(list: DealOfferDTO[], sortBy: Sort): DealOfferDTO[] {
  const by: Record<Sort, (a: DealOfferDTO, b: DealOfferDTO) => number> = {
    desconto: (a, b) => (b.discountPct ?? -1) - (a.discountPct ?? -1),
    preco: (a, b) => a.currentPrice - b.currentPrice,
    lucro: (a, b) => (b.estProfit ?? 0) - (a.estProfit ?? 0),
    margem: (a, b) => (b.estMarginPct ?? -999) - (a.estMarginPct ?? -999),
    oportunidade: (a, b) => b.score - a.score,
  };
  return [...list].sort(by[sortBy] ?? by.oportunidade);
}

/** Uma oferta bate o monitoramento? */
function alertMatches(alert: DealAlert, offer: DealOffer): boolean {
  if (!alert.active) return false;
  const terms = alert.query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  const haystack = `${offer.productName} ${offer.brand ?? ""} ${offer.category ?? ""}`.toLowerCase();
  const textOk = terms.length === 0 || terms.some((t) => haystack.includes(t));
  if (!textOk) return false;
  if (alert.maxPrice != null && offer.currentPrice > alert.maxPrice) return false;
  if (alert.minDiscountPct != null && (offer.discountPct ?? 0) < alert.minDiscountPct) return false;
  if (alert.minMarginPct != null && (offer.estMarginPct ?? -999) < alert.minMarginPct) return false;
  return true;
}

const huntInput = z.object({
  query: z.string().min(2),
  category: z.string().nullable().optional(),
  /** Centavos */
  maxBuyPrice: z.number().int().nullable().optional(),
  quantity: z.number().int().min(1).default(1),
  minMarginPct: z.number().int().nullable().optional(),
  /** Centavos */
  minSalePrice: z.number().int().nullable().optional(),
  minDiscountPct: z.number().int().nullable().optional(),
  sources: z.array(z.string()).default([]),
  sortBy: z.enum(SORTS).default("oportunidade"),
});

const settingsInput = z.object({
  enabledSources: z.array(z.string()).min(1),
  maxResults: z.number().int().min(1).max(30),
  defaultShipping: z.number().int().min(0),
  packagingCost: z.number().int().min(0),
  taxPct: z.number().int().min(0).max(100),
  otherPct: z.number().int().min(0).max(100),
  quickMarginPct: z.number().int().min(0).max(95),
  normalMarginPct: z.number().int().min(0).max(95),
  premiumMarginPct: z.number().int().min(0).max(95),
});

const alertInput = z.object({
  id: z.number().int().optional(),
  label: z.string().min(2),
  query: z.string().min(2),
  category: z.string().nullable().optional(),
  maxPrice: z.number().int().nullable().optional(),
  minDiscountPct: z.number().int().nullable().optional(),
  minMarginPct: z.number().int().nullable().optional(),
  active: z.boolean().default(true),
});

export const dealHunter = {
  // ---------- Fontes disponíveis ----------
  sources: adminBase.handler(() => [...DEAL_SOURCES]),

  // ---------- Configurações ----------
  settings: adminBase.handler(() => getSettings()),

  saveSettings: adminBase.input(settingsInput).handler(async ({ input }) => {
    const current = await getSettings();
    const [row] = await db
      .update(schema.dealSettings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.dealSettings.id, current.id))
      .returning();
    return row;
  }),

  // ---------- Caçada ----------
  hunt: adminBase.input(huntInput).handler(async ({ input }) => {
    const settings = await getSettings();
    const costs = costsOf(settings);
    const sources = input.sources.length ? input.sources : settings.enabledSources;

    const outcome = await searchDeals({
      query: input.query,
      category: input.category ?? null,
      maxBuyPriceBrl: toBrl(input.maxBuyPrice ?? null),
      quantity: input.quantity,
      minDiscountPct: input.minDiscountPct ?? null,
      minSalePriceBrl: toBrl(input.minSalePrice ?? null),
      sources,
      maxResults: settings.maxResults,
    });

    const [search] = await db
      .insert(schema.dealSearches)
      .values({
        query: input.query,
        category: input.category ?? null,
        maxBuyPrice: input.maxBuyPrice ?? null,
        quantity: input.quantity,
        minMarginPct: input.minMarginPct ?? null,
        minSalePrice: input.minSalePrice ?? null,
        minDiscountPct: input.minDiscountPct ?? null,
        sources,
        sortBy: input.sortBy,
        resultCount: 0,
        note: outcome.note,
        error: outcome.error,
        createdAt: new Date(),
      })
      .returning();

    if (outcome.error) {
      return {
        ok: false as const,
        searchId: search.id,
        offers: [] as DealOfferDTO[],
        filteredOut: 0,
        notFound: outcome.notFoundStores,
        triggeredAlerts: [] as string[],
        message:
          "Não consegui caçar as ofertas agora. Tente de novo em alguns minutos — a busca depende de IA com acesso à web.",
        detail: outcome.error,
      };
    }

    // Analisa cada oferta e aplica os filtros do admin
    let filteredOut = 0;
    const rows: (typeof schema.dealOffers.$inferInsert)[] = [];
    for (const o of outcome.offers) {
      const currentPrice = toCents(o.priceBrl)!;
      const analysis = analyzeDeal(
        {
          currentPrice,
          previousPrice: toCents(o.previousPriceBrl),
          discountPct: o.discountPct != null ? Math.round(o.discountPct) : null,
          shippingCost: toCents(o.shippingBrl),
          marketAvg: toCents(o.marketAvgBrl),
          quantityAvailable: o.quantityAvailable,
          availability: o.availability,
          sellerRating: o.sellerRating,
        },
        costs,
      );

      // Filtros duros do painel de pesquisa
      if (input.maxBuyPrice != null && currentPrice > input.maxBuyPrice) {
        filteredOut++;
        continue;
      }
      if (input.minDiscountPct != null && (analysis.discountPct ?? 0) < input.minDiscountPct) {
        filteredOut++;
        continue;
      }
      if (input.minMarginPct != null && (analysis.estMarginPct ?? -999) < input.minMarginPct) {
        filteredOut++;
        continue;
      }
      if (input.minSalePrice != null && analysis.suggestedPrice < input.minSalePrice) {
        filteredOut++;
        continue;
      }

      rows.push({
        searchId: search.id,
        productName: o.productName.slice(0, 300),
        brand: o.brand,
        store: o.store,
        imageUrl: o.imageUrl,
        url: o.url,
        category: o.category ?? input.category ?? null,
        previousPrice: toCents(o.previousPriceBrl),
        currentPrice,
        discountPct: analysis.discountPct,
        shippingCost: toCents(o.shippingBrl),
        shippingNote: o.shippingNote,
        totalCost: analysis.realCost,
        marketAvg: toCents(o.marketAvgBrl),
        suggestedPrice: analysis.suggestedPrice,
        estProfit: analysis.estProfit,
        estMarginPct: analysis.estMarginPct,
        availability: o.availability,
        quantityAvailable: o.quantityAvailable,
        sellerRating: o.sellerRating,
        score: analysis.score,
        insufficientData: analysis.insufficientData ? 1 : 0,
        fakeDiscount: analysis.fakeDiscount ? 1 : 0,
        warnings: [...analysis.warnings, ...(o.analysis ? [] : [])],
        analysis: o.analysis,
        createdAt: new Date(),
      });
    }

    const saved = rows.length
      ? await db.insert(schema.dealOffers).values(rows).returning()
      : ([] as DealOffer[]);

    await db
      .update(schema.dealSearches)
      .set({ resultCount: saved.length })
      .where(eq(schema.dealSearches.id, search.id));

    // Monitoramentos que bateram
    const alerts = await db.select().from(schema.dealAlerts);
    const triggeredAlerts: string[] = [];
    for (const alert of alerts) {
      const hit = saved.find((o) => alertMatches(alert, o));
      if (!hit) continue;
      triggeredAlerts.push(alert.label);
      await db
        .update(schema.dealAlerts)
        .set({ lastTriggeredAt: new Date(), lastOfferId: hit.id, hits: alert.hits + 1 })
        .where(eq(schema.dealAlerts.id, alert.id));
    }

    const parts: string[] = [];
    parts.push(
      saved.length
        ? `${saved.length} oferta(s) encontrada(s).`
        : "Nenhuma oferta dentro dos seus critérios.",
    );
    if (filteredOut) parts.push(`${filteredOut} descartada(s) pelos filtros.`);
    if (outcome.notFoundStores.length)
      parts.push(`Sem resultado em: ${outcome.notFoundStores.join(", ")}.`);
    if (outcome.note) parts.push(outcome.note);

    return {
      ok: true as const,
      searchId: search.id,
      offers: sortOffers(
        saved.map((o) => withScenarios(o, costs)),
        input.sortBy,
      ),
      filteredOut,
      notFound: outcome.notFoundStores,
      triggeredAlerts,
      message: parts.join(" "),
      detail: null,
    };
  }),

  // ---------- Ofertas de uma pesquisa ----------
  offers: adminBase
    .input(
      z.object({
        searchId: z.number().int().nullable().optional(),
        sortBy: z.enum(SORTS).default("oportunidade"),
        store: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        maxPrice: z.number().int().nullable().optional(),
        minDiscountPct: z.number().int().nullable().optional(),
        minMarginPct: z.number().int().nullable().optional(),
        minProfit: z.number().int().nullable().optional(),
        minScore: z.number().int().nullable().optional(),
        onlyAvailable: z.boolean().default(false),
        limit: z.number().int().min(1).max(200).default(60),
      }),
    )
    .handler(async ({ input }): Promise<DealOfferDTO[]> => {
      const settings = await getSettings();
      const costs = costsOf(settings);
      const rows = await db
        .select()
        .from(schema.dealOffers)
        .where(
          input.searchId != null ? eq(schema.dealOffers.searchId, input.searchId) : undefined,
        )
        .orderBy(desc(schema.dealOffers.score))
        .limit(input.limit);

      const filtered = rows.filter((o) => {
        if (input.store && o.store !== input.store) return false;
        if (input.category && (o.category ?? "") !== input.category) return false;
        if (input.maxPrice != null && o.currentPrice > input.maxPrice) return false;
        if (input.minDiscountPct != null && (o.discountPct ?? 0) < input.minDiscountPct)
          return false;
        if (input.minMarginPct != null && (o.estMarginPct ?? -999) < input.minMarginPct)
          return false;
        if (input.minProfit != null && (o.estProfit ?? 0) < input.minProfit) return false;
        if (input.minScore != null && o.score < input.minScore) return false;
        if (input.onlyAvailable && !o.availability && o.quantityAvailable == null) return false;
        return true;
      });

      return sortOffers(
        filtered.map((o) => withScenarios(o, costs)),
        input.sortBy,
      );
    }),

  // ---------- TOP 10 ----------
  topOffers: adminBase
    .input(z.object({ searchId: z.number().int().nullable().optional() }))
    .handler(async ({ input }): Promise<DealOfferDTO[]> => {
      const settings = await getSettings();
      const costs = costsOf(settings);
      const rows = await db
        .select()
        .from(schema.dealOffers)
        .where(input.searchId != null ? eq(schema.dealOffers.searchId, input.searchId) : undefined)
        .orderBy(desc(schema.dealOffers.score), desc(schema.dealOffers.createdAt))
        .limit(10);
      return rows.map((o) => withScenarios(o, costs));
    }),

  // ---------- Histórico ----------
  searches: adminBase
    .input(z.object({ limit: z.number().int().min(1).max(100).default(40) }))
    .handler(async ({ input }) =>
      db
        .select()
        .from(schema.dealSearches)
        .orderBy(desc(schema.dealSearches.createdAt))
        .limit(input.limit),
    ),

  deleteSearch: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.dealOffers).where(eq(schema.dealOffers.searchId, input.id));
    await db.delete(schema.dealSearches).where(eq(schema.dealSearches.id, input.id));
    return { ok: true };
  }),

  /** Evolução de preço do mesmo termo pesquisado ao longo do tempo. */
  priceHistory: adminBase
    .input(z.object({ query: z.string().min(2) }))
    .handler(async ({ input }) => {
      const term = input.query.trim().toLowerCase();
      const searches = await db
        .select()
        .from(schema.dealSearches)
        .where(like(sql`lower(${schema.dealSearches.query})`, `%${term}%`))
        .orderBy(desc(schema.dealSearches.createdAt))
        .limit(20);
      if (searches.length === 0) return [];

      const out: Array<{
        searchId: number;
        query: string;
        date: Date;
        count: number;
        minPrice: number | null;
        avgPrice: number | null;
        bestScore: number | null;
      }> = [];
      for (const s of searches) {
        const rows = await db
          .select()
          .from(schema.dealOffers)
          .where(eq(schema.dealOffers.searchId, s.id));
        const prices = rows.map((r) => r.currentPrice);
        out.push({
          searchId: s.id,
          query: s.query,
          date: s.createdAt,
          count: rows.length,
          minPrice: prices.length ? Math.min(...prices) : null,
          avgPrice: prices.length
            ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
            : null,
          bestScore: rows.length ? Math.max(...rows.map((r) => r.score)) : null,
        });
      }
      return out.reverse();
    }),

  // ---------- Análise de revenda de uma oferta ----------
  analyzeForResale: adminBase
    .input(
      z.object({
        offerId: z.number().int(),
        /** Sobrescreve o preço de compra (centavos), ex.: negociou desconto. */
        buyPrice: z.number().int().nullable().optional(),
        /** Frete real (centavos) quando o anúncio não informou. */
        shippingCost: z.number().int().nullable().optional(),
        quantity: z.number().int().min(1).default(1),
      }),
    )
    .handler(async ({ input }) => {
      const [offer] = await db
        .select()
        .from(schema.dealOffers)
        .where(eq(schema.dealOffers.id, input.offerId));
      if (!offer) throw new ORPCError("NOT_FOUND", { message: "Oferta não encontrada" });
      const settings = await getSettings();
      const costs = costsOf(settings);

      const price = input.buyPrice ?? offer.currentPrice;
      const shipping = input.shippingCost ?? offer.shippingCost;
      const analysis = analyzeDeal(
        {
          currentPrice: price,
          previousPrice: offer.previousPrice,
          discountPct: offer.discountPct,
          shippingCost: shipping,
          marketAvg: offer.marketAvg,
          quantityAvailable: offer.quantityAvailable,
          availability: offer.availability,
          sellerRating: offer.sellerRating,
        },
        costs,
      );

      const qty = input.quantity;
      return {
        offer,
        quantity: qty,
        buyPrice: price,
        shippingCost: shipping,
        realCost: analysis.realCost,
        investment: analysis.realCost * qty,
        score: analysis.score,
        insufficientData: analysis.insufficientData,
        fakeDiscount: analysis.fakeDiscount,
        warnings: analysis.warnings,
        scenarios: analysis.scenarios.map((s) => ({
          ...s,
          totalProfit: s.profit * qty,
          totalRevenue: s.price * qty,
        })),
      };
    }),

  deleteOffer: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.dealOffers).where(eq(schema.dealOffers.id, input.id));
    return { ok: true };
  }),

  // ---------- Monitoramentos / alertas ----------
  alerts: adminBase.handler(() =>
    db.select().from(schema.dealAlerts).orderBy(desc(schema.dealAlerts.createdAt)),
  ),

  saveAlert: adminBase.input(alertInput).handler(async ({ input }) => {
    const values = {
      label: input.label.trim(),
      query: input.query.trim(),
      category: input.category ?? null,
      maxPrice: input.maxPrice ?? null,
      minDiscountPct: input.minDiscountPct ?? null,
      minMarginPct: input.minMarginPct ?? null,
      active: input.active ? 1 : 0,
    };
    if (input.id) {
      const [row] = await db
        .update(schema.dealAlerts)
        .set(values)
        .where(eq(schema.dealAlerts.id, input.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(schema.dealAlerts)
      .values({ ...values, createdAt: new Date() })
      .returning();
    return row;
  }),

  deleteAlert: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.dealAlerts).where(eq(schema.dealAlerts.id, input.id));
    return { ok: true };
  }),

  /** Ofertas já salvas que batem com os monitoramentos ativos. */
  alertHits: adminBase.handler(async (): Promise<
    Array<{ alert: DealAlert; offers: DealOfferDTO[] }>
  > => {
    const settings = await getSettings();
    const costs = costsOf(settings);
    const alerts = await db
      .select()
      .from(schema.dealAlerts)
      .where(eq(schema.dealAlerts.active, 1));
    if (alerts.length === 0) return [];
    const offers = await db
      .select()
      .from(schema.dealOffers)
      .orderBy(desc(schema.dealOffers.createdAt))
      .limit(300);
    return alerts.map((alert) => ({
      alert,
      offers: offers
        .filter((o) => alertMatches(alert, o))
        .slice(0, 6)
        .map((o) => withScenarios(o, costs)),
    }));
  }),

  /** Resumo para o topo do painel. */
  overview: adminBase.handler(async () => {
    const [searchCount] = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.dealSearches);
    const [offerCount] = await db.select({ n: sql<number>`count(*)` }).from(schema.dealOffers);
    const [best] = await db
      .select()
      .from(schema.dealOffers)
      .orderBy(desc(schema.dealOffers.score))
      .limit(1);
    const [lastSearch] = await db
      .select()
      .from(schema.dealSearches)
      .orderBy(desc(schema.dealSearches.createdAt))
      .limit(1);
    const activeAlerts = await db
      .select()
      .from(schema.dealAlerts)
      .where(eq(schema.dealAlerts.active, 1));
    return {
      searches: Number(searchCount?.n ?? 0),
      offers: Number(offerCount?.n ?? 0),
      bestScore: best?.score ?? null,
      bestOfferName: best?.productName ?? null,
      lastSearchId: lastSearch?.id ?? null,
      lastQuery: lastSearch?.query ?? null,
      activeAlerts: activeAlerts.length,
    };
  }),
};
