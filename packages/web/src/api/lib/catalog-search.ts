import { createGateway, generateObject } from "ai";
import { z } from "zod";
import type { CatalogProduct } from "../database/schema";

const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

/**
 * Modelo com acesso real à web. Mercado Livre, Shopee e Amazon bloqueiam
 * acesso direto do servidor (403/503/página de tráfego suspeito), então a
 * busca de preços é feita por IA com navegação própria.
 */
const SEARCH_MODEL = "perplexity/sonar";

export const STORES = ["Mercado Livre", "Shopee", "Amazon"] as const;

const resultSchema = z.object({
  store: z.string(),
  productName: z.string(),
  priceBrl: z.number(),
  url: z.string().nullable(),
  availability: z.string().nullable(),
  shipping: z.string().nullable(),
  matchType: z.enum(["exato", "equivalente", "diferente"]),
});

const responseSchema = z.object({
  results: z.array(resultSchema),
  note: z.string().nullable(),
});

export type MarketSearchResult = z.infer<typeof resultSchema>;

export type MarketSearchOutcome = {
  results: MarketSearchResult[];
  /** Lojas em que nada confiável foi encontrado. */
  notFoundStores: string[];
  /** Observação da IA para mostrar ao admin (pode ser null). */
  note: string | null;
  /** Mensagem de erro quando a busca falhou por completo. */
  error: string | null;
};

function buildQuery(p: Pick<CatalogProduct, "name" | "code" | "material" | "dimensions" | "brand" | "category">): string {
  const bits = [p.name];
  if (p.brand) bits.push(p.brand);
  if (p.material) bits.push(p.material);
  if (p.dimensions) bits.push(p.dimensions);
  if (p.category) bits.push(`(categoria: ${p.category})`);
  if (p.code) bits.push(`(código do fornecedor: ${p.code})`);
  return bits.join(" ");
}

const PROMPT_RULES = `Você pesquisa preços de varejo no Brasil para a Rafa Laser,
uma loja de presentes personalizados e gravação a laser.

REGRAS ABSOLUTAS:
- Pesquise anúncios REAIS que estejam à venda AGORA no Mercado Livre (mercadolivre.com.br),
  Shopee (shopee.com.br) e Amazon Brasil (amazon.com.br).
- NUNCA invente preço, nome ou link. Se não encontrar em uma loja, simplesmente não
  retorne resultado dela e explique no campo "note".
- priceBrl é o preço de venda ao consumidor em reais, apenas número (ex.: 39.90).
- Prefira anúncios de UNIDADE. Se o anúncio for um kit/caixa, informe isso no
  productName e classifique matchType como "diferente".
- matchType: "exato" = mesmo produto; "equivalente" = produto muito parecido
  (mesmo tipo, material e tamanho); "diferente" = só serve de referência distante.
- Traga no máximo 8 resultados, priorizando os mais vendidos e bem avaliados.
- store deve ser exatamente "Mercado Livre", "Shopee" ou "Amazon".
- note: escreva em português uma observação curta para o lojista (ex.: quais lojas
  não tinham o produto, se os preços encontrados são de kit em vez de unidade).`;

/**
 * Busca preços de mercado do produto nas três lojas.
 * Nunca lança: devolve o erro no campo `error` para a tela avisar o admin.
 */
export async function searchMarketPrices(
  product: Pick<
    CatalogProduct,
    "name" | "code" | "material" | "dimensions" | "brand" | "category"
  >,
): Promise<MarketSearchOutcome> {
  const query = buildQuery(product);
  try {
    const { object } = await generateObject({
      model: gateway(SEARCH_MODEL),
      schema: responseSchema,
      system: PROMPT_RULES,
      prompt: `Busque o preço atual deste produto no Mercado Livre, na Shopee e na Amazon Brasil:\n\n${query}`,
    });

    const results = object.results
      .filter((r) => Number.isFinite(r.priceBrl) && r.priceBrl > 0 && r.productName.trim())
      .map((r) => ({
        ...r,
        store: normalizeStore(r.store),
        url: r.url?.startsWith("http") ? r.url : null,
      }))
      .slice(0, 12);

    const found = new Set(results.map((r) => r.store));
    const notFoundStores = STORES.filter((s) => !found.has(s));

    return { results, notFoundStores, note: object.note?.trim() || null, error: null };
  } catch (e) {
    return {
      results: [],
      notFoundStores: [...STORES],
      note: null,
      error: e instanceof Error ? e.message.slice(0, 300) : "Falha desconhecida na busca.",
    };
  }
}

function normalizeStore(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("mercado")) return "Mercado Livre";
  if (s.includes("shopee")) return "Shopee";
  if (s.includes("amazon")) return "Amazon";
  return raw.trim() || "Outra loja";
}
