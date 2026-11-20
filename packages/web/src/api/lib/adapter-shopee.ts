/**
 * ShopeeAdapter — leitura pela API oficial de Afiliados da Shopee
 * (https://open-api.affiliate.shopee.com.br/graphql, endpoint productOfferV2).
 *
 * Independente do MercadoLivreAdapter. Sem proxy, sem bypass, sem scraping.
 * Credenciais só no backend: SHOPEE_APP_ID e SHOPEE_APP_SECRET.
 *
 * Limite conhecido da fonte: a API de afiliados devolve título, preço, foto de
 * capa e loja — não devolve descrição, ficha técnica, variações nem estoque.
 * Esses campos voltam null e o motivo aparece no diagnóstico.
 */

import { createHash } from "node:crypto";
import {
  type AdapterResult,
  type AdapterStep,
  type MarketplaceAttribute,
  type MarketplaceListing,
  emptyListing,
  missingFields,
} from "./marketplace";

const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

/** Extrai shopId e itemId de qualquer formato de link da Shopee. */
export function extractShopeeIds(url: string): { shopId: string | null; itemId: string | null } {
  // .../nome-do-produto-i.123456789.987654321
  const long = url.match(/i\.(\d{3,})\.(\d{3,})/);
  if (long) return { shopId: long[1], itemId: long[2] };

  // /product/123456789/987654321
  const product = url.match(/\/product\/(\d{3,})\/(\d{3,})/);
  if (product) return { shopId: product[1], itemId: product[2] };

  try {
    const parsed = new URL(url);
    const itemId = parsed.searchParams.get("itemId") ?? parsed.searchParams.get("item_id");
    const shopId = parsed.searchParams.get("shopId") ?? parsed.searchParams.get("shop_id");
    if (itemId && /^\d{3,}$/.test(itemId)) {
      return { shopId: shopId && /^\d{3,}$/.test(shopId) ? shopId : null, itemId };
    }
  } catch {
    /* link inválido */
  }
  return { shopId: null, itemId: null };
}

export function shopeeConfigured(): boolean {
  return Boolean(process.env.SHOPEE_APP_ID?.trim() && process.env.SHOPEE_APP_SECRET?.trim());
}

type GraphQlResponse = {
  data?: {
    productOfferV2?: {
      nodes?: ShopeeNode[];
    } | null;
  };
  errors?: { message?: string; extensions?: { code?: number; message?: string } }[];
};

type ShopeeNode = {
  itemId?: number | string;
  productName?: string;
  productLink?: string;
  offerLink?: string;
  imageUrl?: string;
  priceMin?: string | number;
  priceMax?: string | number;
  priceDiscountRate?: string | number;
  sales?: number;
  ratingStar?: string | number;
  shopId?: number | string;
  shopName?: string;
  shopType?: number[];
  commissionRate?: string;
};

/** Assinatura exigida pela Shopee: SHA256(AppId + Timestamp + Payload + Secret). */
function authHeader(appId: string, secret: string, payload: string): { header: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha256").update(`${appId}${timestamp}${payload}${secret}`).digest("hex");
  return {
    header: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    timestamp,
  };
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function queryOffer(
  query: string,
  step: string,
  log: AdapterStep[],
): Promise<ShopeeNode[] | null> {
  const appId = process.env.SHOPEE_APP_ID?.trim() ?? "";
  const secret = process.env.SHOPEE_APP_SECRET?.trim() ?? "";
  const payload = JSON.stringify({ query });
  const { header } = authHeader(appId, secret, payload);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: header },
      body: payload,
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text();
    let json: GraphQlResponse | null = null;
    try {
      json = JSON.parse(text) as GraphQlResponse;
    } catch {
      json = null;
    }

    if (!res.ok) {
      log.push({
        step,
        endpoint: ENDPOINT,
        status: res.status,
        ok: false,
        message: json?.errors?.[0]?.extensions?.message ?? json?.errors?.[0]?.message ?? text.slice(0, 200),
      });
      return null;
    }
    if (json?.errors?.length) {
      const err = json.errors[0];
      log.push({
        step,
        endpoint: ENDPOINT,
        status: res.status,
        ok: false,
        message: `${err.extensions?.code ? `code ${err.extensions.code} — ` : ""}${
          err.extensions?.message ?? err.message ?? "erro da API de afiliados"
        }`,
      });
      return null;
    }

    const nodes = json?.data?.productOfferV2?.nodes ?? [];
    log.push({
      step,
      endpoint: ENDPOINT,
      status: res.status,
      ok: nodes.length > 0,
      message: `${nodes.length} produto(s)`,
    });
    return nodes;
  } catch (err) {
    log.push({
      step,
      endpoint: ENDPOINT,
      ok: false,
      message: err instanceof Error ? err.message : "falha de rede",
    });
    return null;
  }
}

/** Importa um anúncio da Shopee pela API oficial de afiliados. */
export async function importFromShopee(url: string): Promise<AdapterResult> {
  const log: AdapterStep[] = [];
  const { shopId, itemId } = extractShopeeIds(url);

  if (!itemId) {
    log.push({ step: "item_id", ok: false, message: "não encontramos o código do produto no link" });
    return {
      ok: false,
      listing: null,
      log,
      missing: [],
      error:
        "Não encontramos o código do produto neste link da Shopee. Use o link completo do produto (contém i.LOJA.PRODUTO).",
    };
  }
  log.push({ step: "item_id", ok: true, message: shopId ? `${itemId} (loja ${shopId})` : itemId });

  if (!shopeeConfigured()) {
    log.push({ step: "credenciais", ok: false, message: "SHOPEE_APP_ID/SHOPEE_APP_SECRET não configurados" });
    return {
      ok: false,
      listing: null,
      log,
      missing: [],
      error:
        "A Shopee só libera dados de produto pela API oficial de Afiliados. Configure SHOPEE_APP_ID e SHOPEE_APP_SECRET no servidor.",
    };
  }

  const fields = `itemId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate sales ratingStar shopId shopName commissionRate`;

  let nodes = await queryOffer(
    `{ productOfferV2(itemId: ${itemId}${shopId ? `, shopId: ${shopId}` : ""}, limit: 1) { nodes { ${fields} } } }`,
    "productOfferV2 (itemId)",
    log,
  );

  // Alguns produtos só respondem sem o filtro de loja
  if ((!nodes || !nodes.length) && shopId) {
    nodes = await queryOffer(
      `{ productOfferV2(itemId: ${itemId}, limit: 1) { nodes { ${fields} } } }`,
      "productOfferV2 (sem shopId)",
      log,
    );
  }

  const node = nodes?.[0];
  if (!node) {
    const failed = log.filter((s) => !s.ok).at(-1);
    return {
      ok: false,
      listing: null,
      log,
      missing: [],
      error:
        failed?.message && failed.step.startsWith("productOfferV2") && failed.status
          ? `A API de Afiliados da Shopee recusou a consulta (HTTP ${failed.status}): ${failed.message}`
          : "A API de Afiliados da Shopee não devolveu este produto (produto fora do programa de afiliados, sem oferta ativa ou fora da conta autorizada).",
    };
  }

  const listing = emptyListing("shopee", url, String(node.itemId ?? itemId));
  listing.title = str(node.productName);
  listing.currency = "BRL";
  listing.price = num(node.priceMin);
  listing.images = [str(node.imageUrl)].filter((u): u is string => u !== null);
  listing.seller = str(node.shopName);

  const attributes: MarketplaceAttribute[] = [];
  const priceMax = num(node.priceMax);
  if (priceMax && listing.price && priceMax > listing.price) {
    attributes.push({ name: "Faixa de preço", value: `R$ ${listing.price.toFixed(2)} a R$ ${priceMax.toFixed(2)}` });
  }
  const discount = num(node.priceDiscountRate);
  if (discount) attributes.push({ name: "Desconto informado pela Shopee", value: `${discount}%` });
  const rating = num(node.ratingStar);
  if (rating) attributes.push({ name: "Avaliação", value: rating.toFixed(1) });
  if (typeof node.sales === "number" && node.sales > 0) {
    attributes.push({ name: "Vendidos", value: String(node.sales) });
  }
  if (str(node.shopName)) attributes.push({ name: "Loja de origem", value: str(node.shopName) as string });
  listing.attributes = attributes;

  return {
    ok: Boolean(listing.title),
    listing,
    log,
    missing: missingFields(listing),
    error: null,
  };
}
