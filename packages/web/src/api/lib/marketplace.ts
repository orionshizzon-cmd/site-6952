/**
 * Formato único de anúncio importado + diagnóstico, compartilhado por todos
 * os conectores de marketplace (Mercado Livre, Shopee, ...).
 *
 * Regra do módulo: nada aqui inventa dado. Campo sem informação vem `null`
 * (ou lista vazia) e o motivo fica registrado no log de diagnóstico.
 */

export type MarketplaceId = "mercadolivre" | "shopee";

export type MarketplaceAttribute = { name: string; value: string };

export type MarketplaceListing = {
  marketplace: MarketplaceId;
  itemId: string | null;
  title: string | null;
  /** Preço à vista em reais. */
  price: number | null;
  /** Preço "de" (sem desconto) em reais. */
  originalPrice: number | null;
  currency: string | null;
  description: string | null;
  images: string[];
  brand: string | null;
  model: string | null;
  category: string | null;
  attributes: MarketplaceAttribute[];
  variations: string[];
  stock: number | null;
  seller: string | null;
  sourceUrl: string;
  collectedAt: string;
};

/** Uma etapa da importação, do jeito que aparece no diagnóstico da tela. */
export type AdapterStep = {
  step: string;
  endpoint?: string;
  status?: number;
  message?: string;
  ok: boolean;
};

export type AdapterResult = {
  ok: boolean;
  listing: MarketplaceListing | null;
  log: AdapterStep[];
  /** Campos que a fonte oficial não entregou (não significa que o anúncio não tenha). */
  missing: string[];
  /** Erro que impediu a importação pela fonte oficial. */
  error: string | null;
};

export const MARKETPLACE_LABEL: Record<MarketplaceId, string> = {
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
};

export function emptyListing(marketplace: MarketplaceId, sourceUrl: string, itemId: string | null): MarketplaceListing {
  return {
    marketplace,
    itemId,
    title: null,
    price: null,
    originalPrice: null,
    currency: null,
    description: null,
    images: [],
    brand: null,
    model: null,
    category: null,
    attributes: [],
    variations: [],
    stock: null,
    seller: null,
    sourceUrl,
    collectedAt: new Date().toISOString(),
  };
}

/** Quais campos do formato único ficaram sem informação. */
export function missingFields(listing: MarketplaceListing): string[] {
  const out: string[] = [];
  if (!listing.title) out.push("Título");
  if (listing.price == null) out.push("Preço");
  if (listing.originalPrice == null) out.push("Preço original");
  if (!listing.description) out.push("Descrição");
  if (!listing.images.length) out.push("Fotos");
  if (!listing.brand) out.push("Marca");
  if (!listing.model) out.push("Modelo");
  if (!listing.category) out.push("Categoria");
  if (!listing.attributes.length) out.push("Características");
  if (!listing.variations.length) out.push("Variações");
  if (listing.stock == null) out.push("Estoque");
  if (!listing.seller) out.push("Vendedor");
  return out;
}

/** Bloco de texto no formato que o cliente pediu no diagnóstico. */
export function formatDiagnostics(args: {
  url: string;
  marketplace: string | null;
  itemId: string | null;
  log: AdapterStep[];
  listing: MarketplaceListing | null;
}): string {
  const { url, marketplace, itemId, log, listing } = args;
  const api = log
    .map((s) => {
      const parts = [s.ok ? "OK" : "FALHOU"];
      if (s.status) parts.push(`HTTP ${s.status}`);
      if (s.endpoint) parts.push(s.endpoint);
      if (s.message) parts.push(s.message);
      return `${s.step.toUpperCase()}: ${parts.join(" | ")}`;
    })
    .join("\n");

  const result = listing
    ? [
        `TITLE: ${listing.title ?? "—"}`,
        `PRICE: ${listing.price != null ? `R$ ${listing.price.toFixed(2)}` : "—"}`,
        `IMAGES: ${listing.images.length}`,
        `DESCRIPTION: ${listing.description ? `${listing.description.length} caracteres` : "—"}`,
        `ATTRIBUTES: ${listing.attributes.length}`,
      ].join("\n")
    : "TITLE: —\nPRICE: —\nIMAGES: 0\nDESCRIPTION: —\nATTRIBUTES: 0";

  return [
    "[IMPORT]",
    `URL: ${url}`,
    `MARKETPLACE: ${marketplace ?? "—"}`,
    `ITEM_ID: ${itemId ?? "—"}`,
    "",
    "[API]",
    api || "(nenhuma chamada)",
    "",
    "[RESULT]",
    result,
  ].join("\n");
}

/** Ficha técnica em linhas "Campo: valor" a partir dos atributos oficiais. */
export function attributesToSpecs(attributes: MarketplaceAttribute[]): string | null {
  const lines = attributes
    .filter((a) => a.name.trim() && a.value.trim())
    .map((a) => `${a.name.trim()}: ${a.value.trim()}`);
  return lines.length ? lines.join("\n") : null;
}

/** Texto legível do anúncio oficial — entra no prompt da IA como verdade. */
export function listingFactsText(listing: MarketplaceListing): string {
  const lines: string[] = [];
  lines.push(`Marketplace: ${MARKETPLACE_LABEL[listing.marketplace]}`);
  if (listing.itemId) lines.push(`Código do anúncio: ${listing.itemId}`);
  if (listing.title) lines.push(`Título: ${listing.title}`);
  if (listing.price != null) lines.push(`Preço: R$ ${listing.price.toFixed(2)}`);
  if (listing.originalPrice != null) lines.push(`Preço original: R$ ${listing.originalPrice.toFixed(2)}`);
  if (listing.brand) lines.push(`Marca: ${listing.brand}`);
  if (listing.model) lines.push(`Modelo: ${listing.model}`);
  if (listing.category) lines.push(`Categoria de origem: ${listing.category}`);
  if (listing.stock != null) lines.push(`Estoque disponível: ${listing.stock}`);
  if (listing.variations.length) lines.push(`Variações: ${listing.variations.join(" | ")}`);
  if (listing.attributes.length) {
    lines.push("Características oficiais:");
    for (const a of listing.attributes.slice(0, 60)) lines.push(`- ${a.name}: ${a.value}`);
  }
  if (listing.description) {
    lines.push("Descrição original do anúncio (não copiar literalmente, usar só como informação):");
    lines.push(listing.description.slice(0, 6000));
  }
  return lines.join("\n");
}
