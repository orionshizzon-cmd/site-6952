import { createGateway, generateObject } from "ai";
import { z } from "zod";

const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

/**
 * Modelo com acesso real à web. As lojas bloqueiam scraping direto do servidor
 * (403/503/página de tráfego suspeito), então a caçada é feita por IA que navega.
 */
const SEARCH_MODEL = "perplexity/sonar";

/** Fontes que o admin pode habilitar nas pesquisas. */
export const DEAL_SOURCES = [
  "Mercado Livre",
  "Shopee",
  "Amazon",
  "AliExpress",
  "Magazine Luiza",
  "Americanas",
  "Casas Bahia",
  "Shein",
] as const;

const offerSchema = z.object({
  productName: z.string(),
  brand: z.string().nullable(),
  store: z.string(),
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
  category: z.string().nullable(),
  /** Preço promocional atual em reais. */
  priceBrl: z.number(),
  /** Preço "de" / anterior em reais, quando o anúncio mostrar. */
  previousPriceBrl: z.number().nullable(),
  /** Desconto anunciado em %, quando o anúncio mostrar. */
  discountPct: z.number().nullable(),
  /** Frete em reais. 0 = frete grátis. Null = não informado. */
  shippingBrl: z.number().nullable(),
  shippingNote: z.string().nullable(),
  /** Preço médio praticado por outros vendedores para o mesmo produto, em reais. */
  marketAvgBrl: z.number().nullable(),
  availability: z.string().nullable(),
  quantityAvailable: z.number().nullable(),
  sellerRating: z.string().nullable(),
  /** Observação curta da IA sobre a confiabilidade da oferta. */
  analysis: z.string().nullable(),
});

const responseSchema = z.object({
  offers: z.array(offerSchema),
  note: z.string().nullable(),
});

export type RawDealOffer = z.infer<typeof offerSchema>;

export type DealSearchOutcome = {
  offers: RawDealOffer[];
  /** Lojas em que nada confiável foi encontrado. */
  notFoundStores: string[];
  note: string | null;
  error: string | null;
};

export type DealSearchParams = {
  query: string;
  category?: string | null;
  maxBuyPriceBrl?: number | null;
  quantity?: number | null;
  minDiscountPct?: number | null;
  minSalePriceBrl?: number | null;
  sources: string[];
  maxResults: number;
};

const PROMPT_RULES = `Você é o Caçador de Ofertas da Rafa Laser, uma loja brasileira de
presentes personalizados e gravação a laser que compra produtos em promoção para revender.

REGRAS ABSOLUTAS:
- Pesquise anúncios REAIS, à venda AGORA, nas lojas pedidas pelo usuário.
- NUNCA invente preço, desconto, estoque, frete, link ou imagem. Campo sem dado confirmado = null.
- É proibido estimar um "preço anterior" ou um "desconto" que o anúncio não mostra.
- priceBrl é o preço à vista/promocional atual em reais, apenas número (ex.: 39.90).
- marketAvgBrl: preço médio do MESMO produto em outros vendedores/lojas. Se você não
  conseguir comparar com outros anúncios, devolva null.
- shippingBrl: 0 quando o frete for grátis; null quando o anúncio não informar.
- Desconfie de falso desconto: se o "preço de" parecer inflado em relação ao que outros
  vendedores cobram, diga isso no campo analysis.
- analysis: uma frase curta em português para o lojista (ex.: "preço abaixo da média dos
  outros vendedores", "desconto pouco confiável, o 'de' está inflado").
- store deve ser exatamente o nome da loja pesquisada.
- Priorize ofertas com desconto real, boa reputação do vendedor e disponibilidade.
- note: observação curta em português (lojas sem resultado, ressalvas da busca).`;

/**
 * Caça ofertas na internet segundo os filtros do admin.
 * Nunca lança: devolve o erro em `error` para a tela avisar.
 */
export async function searchDeals(params: DealSearchParams): Promise<DealSearchOutcome> {
  const stores = params.sources.length ? params.sources : [...DEAL_SOURCES].slice(0, 3);
  const filters: string[] = [];
  if (params.category) filters.push(`Categoria: ${params.category}.`);
  if (params.maxBuyPriceBrl != null)
    filters.push(`Preço máximo de compra por unidade: R$ ${params.maxBuyPriceBrl.toFixed(2)}.`);
  if (params.quantity && params.quantity > 1)
    filters.push(`Quero comprar ${params.quantity} unidades — prefira anúncios com estoque.`);
  if (params.minDiscountPct != null)
    filters.push(`Desconto mínimo desejado: ${params.minDiscountPct}%.`);
  if (params.minSalePriceBrl != null)
    filters.push(
      `Pretendo revender por no mínimo R$ ${params.minSalePriceBrl.toFixed(2)} — o produto precisa sustentar esse preço.`,
    );

  const prompt = [
    `Produto procurado: ${params.query}`,
    `Lojas a pesquisar: ${stores.join(", ")}.`,
    filters.join(" "),
    `Traga no máximo ${params.maxResults} ofertas, as melhores primeiro.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: gateway(SEARCH_MODEL),
      schema: responseSchema,
      system: PROMPT_RULES,
      prompt,
    });

    const offers = object.offers
      .filter((o) => Number.isFinite(o.priceBrl) && o.priceBrl > 0 && o.productName.trim())
      .map((o) => ({
        ...o,
        store: normalizeStore(o.store, stores),
        url: o.url?.startsWith("http") ? o.url : null,
        imageUrl: o.imageUrl?.startsWith("http") ? o.imageUrl : null,
        previousPriceBrl:
          o.previousPriceBrl != null && o.previousPriceBrl > o.priceBrl ? o.previousPriceBrl : null,
        marketAvgBrl: o.marketAvgBrl != null && o.marketAvgBrl > 0 ? o.marketAvgBrl : null,
        shippingBrl: o.shippingBrl != null && o.shippingBrl >= 0 ? o.shippingBrl : null,
        quantityAvailable:
          o.quantityAvailable != null && o.quantityAvailable > 0
            ? Math.round(o.quantityAvailable)
            : null,
      }))
      .slice(0, Math.max(params.maxResults, 1));

    const found = new Set(offers.map((o) => o.store));
    return {
      offers,
      notFoundStores: stores.filter((s) => !found.has(s)),
      note: object.note?.trim() || null,
      error: null,
    };
  } catch (e) {
    return {
      offers: [],
      notFoundStores: stores,
      note: null,
      error: e instanceof Error ? e.message.slice(0, 300) : "Falha desconhecida na caçada.",
    };
  }
}

function normalizeStore(raw: string, stores: string[]): string {
  const s = raw.toLowerCase();
  const hit = stores.find((st) => s.includes(st.toLowerCase().split(" ")[0]));
  if (hit) return hit;
  if (s.includes("mercado")) return "Mercado Livre";
  if (s.includes("shopee")) return "Shopee";
  if (s.includes("amazon")) return "Amazon";
  if (s.includes("magalu") || s.includes("magazine")) return "Magazine Luiza";
  return raw.trim() || "Outra loja";
}
