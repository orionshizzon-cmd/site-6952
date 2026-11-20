/**
 * MercadoLivreAdapter — leitura pela API oficial do Mercado Livre.
 *
 * Fluxo: URL → ITEM_ID → /items → /items/{id}/prices → /items/{id}/sale_price
 * → /items/{id}/description → normalização para o formato único.
 *
 * O token nunca sai do backend. Nada de scraping, proxy ou bypass aqui.
 */

import {
  type AdapterResult,
  type AdapterStep,
  type MarketplaceAttribute,
  type MarketplaceListing,
  emptyListing,
  missingFields,
} from "./marketplace";

const API = "https://api.mercadolibre.com";

/** Extrai o código do anúncio (MLB...) de qualquer formato de link do Mercado Livre. */
export function extractMercadoLivreItemId(url: string): { itemId: string | null; isCatalog: boolean } {
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }

  // Link de produto de catálogo: /p/MLB12345678 — precisa resolver o anúncio vencedor
  const catalog = url.match(/\/p\/(ML[A-Z]-?\d{6,})/i);
  if (catalog) return { itemId: catalog[1].replace("-", "").toUpperCase(), isCatalog: true };

  // wid=MLB12345678 (link de busca que aponta para um anúncio específico)
  const wid = parsed?.searchParams.get("wid");
  if (wid && /^ML[A-Z]-?\d{6,}$/i.test(wid)) {
    return { itemId: wid.replace("-", "").toUpperCase(), isCatalog: false };
  }
  const itemIdParam = parsed?.searchParams.get("item_id");
  if (itemIdParam && /^ML[A-Z]-?\d{6,}$/i.test(itemIdParam)) {
    return { itemId: itemIdParam.replace("-", "").toUpperCase(), isCatalog: false };
  }

  // MLB-1234567890 (produto.mercadolivre.com.br) ou MLB1234567890
  const direct = url.match(/\b(ML[A-Z])-?(\d{6,})\b/i);
  if (direct) return { itemId: `${direct[1].toUpperCase()}${direct[2]}`, isCatalog: false };

  return { itemId: null, isCatalog: false };
}

// ---------- token ----------

let cached: { token: string; expiresAt: number } | null = null;

export function mercadoLivreConfigured(): boolean {
  return Boolean(
    process.env.ML_ACCESS_TOKEN ||
      (process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET) ||
      process.env.ML_REFRESH_TOKEN,
  );
}

async function tokenRequest(body: Record<string, string>, log: AdapterStep[]): Promise<string | null> {
  const endpoint = `${API}/oauth/token`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let json: { access_token?: string; expires_in?: number; message?: string; error?: string } = {};
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      /* resposta não-JSON */
    }
    if (!res.ok || !json.access_token) {
      log.push({
        step: `token (${body.grant_type})`,
        endpoint,
        status: res.status,
        ok: false,
        message: json.message ?? json.error ?? text.slice(0, 200),
      });
      return null;
    }
    cached = {
      token: json.access_token,
      expiresAt: Date.now() + Math.max((json.expires_in ?? 20_000) - 300, 60) * 1000,
    };
    log.push({ step: `token (${body.grant_type})`, endpoint, status: res.status, ok: true });
    return json.access_token;
  } catch (err) {
    log.push({
      step: `token (${body.grant_type})`,
      endpoint,
      ok: false,
      message: err instanceof Error ? err.message : "falha de rede",
    });
    return null;
  }
}

/** Token de aplicação do backend: estático, refresh_token ou client_credentials. */
async function accessToken(log: AdapterStep[]): Promise<string | null> {
  const fixed = process.env.ML_ACCESS_TOKEN?.trim();
  if (fixed) {
    log.push({ step: "token (ML_ACCESS_TOKEN)", ok: true });
    return fixed;
  }
  if (cached && cached.expiresAt > Date.now()) {
    log.push({ step: "token (cache)", ok: true });
    return cached.token;
  }

  const clientId = process.env.ML_CLIENT_ID?.trim();
  const clientSecret = process.env.ML_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ML_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret) return null;

  if (refreshToken) {
    const token = await tokenRequest(
      { grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken },
      log,
    );
    if (token) return token;
  }
  return tokenRequest({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }, log);
}

// ---------- chamadas ----------

type Json = Record<string, unknown>;

async function apiGet(path: string, token: string, step: string, log: AdapterStep[]): Promise<Json | null> {
  const endpoint = `${API}${path}`;
  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text();
    let json: Json | null = null;
    try {
      json = JSON.parse(text) as Json;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const message =
        (json?.message as string | undefined) ??
        (json?.error as string | undefined) ??
        text.slice(0, 200);
      log.push({ step, endpoint, status: res.status, ok: false, message });
      return null;
    }
    log.push({ step, endpoint, status: res.status, ok: true });
    return json;
  } catch (err) {
    log.push({ step, endpoint, ok: false, message: err instanceof Error ? err.message : "falha de rede" });
    return null;
  }
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

/** Nomes amigáveis para os atributos que mais importam na ficha técnica. */
const ATTR_LABEL: Record<string, string> = {
  BRAND: "Marca",
  MODEL: "Modelo",
  COLOR: "Cor",
  MAIN_COLOR: "Cor principal",
  SECONDARY_COLOR: "Cor secundária",
  SIZE: "Tamanho",
  CAPACITY: "Capacidade",
  VOLUME_CAPACITY: "Capacidade",
  GTIN: "Código GTIN/EAN",
  EAN: "Código EAN",
  WEIGHT: "Peso",
  PACKAGE_WEIGHT: "Peso da embalagem",
  PACKAGE_LENGTH: "Comprimento da embalagem",
  PACKAGE_WIDTH: "Largura da embalagem",
  PACKAGE_HEIGHT: "Altura da embalagem",
  LENGTH: "Comprimento",
  WIDTH: "Largura",
  HEIGHT: "Altura",
  DEPTH: "Profundidade",
  DIAMETER: "Diâmetro",
  MATERIAL: "Material",
  MATERIALS: "Material",
  UNITS_PER_PACKAGE: "Unidades por embalagem",
  IS_KIT: "É kit",
  LINE: "Linha",
  MANUFACTURER: "Fabricante",
};

type MlAttribute = { id?: string; name?: string; value_name?: string | null };

function attrValue(attributes: MlAttribute[], id: string): string | null {
  const found = attributes.find((a) => a.id === id);
  return str(found?.value_name);
}

function mapAttributes(attributes: MlAttribute[]): MarketplaceAttribute[] {
  const out: MarketplaceAttribute[] = [];
  const seen = new Set<string>();
  const ordered = [
    ...attributes.filter((a) => a.id && ATTR_LABEL[a.id]),
    ...attributes.filter((a) => !a.id || !ATTR_LABEL[a.id]),
  ];
  for (const a of ordered) {
    const value = str(a.value_name);
    if (!value) continue;
    const name = (a.id && ATTR_LABEL[a.id]) || str(a.name) || a.id || null;
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, value });
  }
  return out;
}

/** Importa um anúncio do Mercado Livre pela API oficial. */
export async function importFromMercadoLivre(url: string): Promise<AdapterResult> {
  const log: AdapterStep[] = [];
  const { itemId: rawId, isCatalog } = extractMercadoLivreItemId(url);

  if (!rawId) {
    log.push({ step: "item_id", ok: false, message: "não encontramos o código MLB no link" });
    return {
      ok: false,
      listing: null,
      log,
      missing: [],
      error: "Não encontramos o código do anúncio (MLB...) neste link do Mercado Livre.",
    };
  }
  log.push({ step: "item_id", ok: true, message: rawId });

  if (!mercadoLivreConfigured()) {
    log.push({
      step: "credenciais",
      ok: false,
      message: "ML_CLIENT_ID/ML_CLIENT_SECRET (ou ML_ACCESS_TOKEN) não configurados",
    });
    return {
      ok: false,
      listing: null,
      log,
      missing: [],
      error:
        "A API oficial do Mercado Livre exige credenciais. Configure ML_CLIENT_ID e ML_CLIENT_SECRET (ou ML_ACCESS_TOKEN) no servidor.",
    };
  }

  const token = await accessToken(log);
  if (!token) {
    return {
      ok: false,
      listing: null,
      log,
      missing: [],
      error: "Não foi possível obter o token da API do Mercado Livre com as credenciais configuradas.",
    };
  }

  let itemId = rawId;
  if (isCatalog) {
    const product = await apiGet(`/products/${rawId}`, token, "product (catálogo)", log);
    const winner = product?.buy_box_winner as Json | undefined;
    const winnerId = str(winner?.item_id);
    if (winnerId) {
      itemId = winnerId;
      log.push({ step: "item_id (anúncio vencedor)", ok: true, message: winnerId });
    }
  }

  const item = await apiGet(`/items/${itemId}?include_attributes=all`, token, "item", log);
  if (!item) {
    const failed = log.filter((s) => !s.ok).at(-1);
    return {
      ok: false,
      listing: null,
      log,
      missing: [],
      error: `A API do Mercado Livre não devolveu o anúncio ${itemId}${
        failed?.status ? ` (HTTP ${failed.status})` : ""
      }${failed?.message ? `: ${failed.message}` : "."}`,
    };
  }

  const listing = emptyListing("mercadolivre", url, itemId);
  listing.title = str(item.title);
  listing.currency = str(item.currency_id) ?? "BRL";

  // ---------- preço ----------
  const prices = await apiGet(`/items/${itemId}/prices`, token, "prices", log);
  const priceList = Array.isArray(prices?.prices) ? (prices?.prices as Json[]) : [];
  const standard = priceList.find((p) => str(p.type) === "standard") ?? priceList[0];
  const promo = priceList.find((p) => str(p.type) === "promotion");

  const salePrice = await apiGet(
    `/items/${itemId}/sale_price?context=channel_marketplace`,
    token,
    "sale_price",
    log,
  );

  listing.price =
    num(salePrice?.amount) ?? num(promo?.amount) ?? num(standard?.amount) ?? num(item.price) ?? null;
  listing.originalPrice =
    num(salePrice?.regular_amount) ??
    num(standard?.regular_amount) ??
    num(standard?.amount) ??
    num(item.original_price) ??
    num(item.base_price) ??
    null;
  if (listing.originalPrice != null && listing.price != null && listing.originalPrice <= listing.price) {
    listing.originalPrice = null;
  }

  // ---------- descrição ----------
  const description = await apiGet(`/items/${itemId}/description`, token, "description", log);
  listing.description = str(description?.plain_text) ?? str(description?.text);

  // ---------- imagens ----------
  const pictures = Array.isArray(item.pictures) ? (item.pictures as Json[]) : [];
  listing.images = pictures
    .map((p) => str(p.secure_url) ?? str(p.url))
    .filter((u): u is string => u !== null);
  if (!listing.images.length) {
    const thumb = str(item.secure_thumbnail) ?? str(item.thumbnail);
    if (thumb) listing.images = [thumb];
  }

  // ---------- atributos ----------
  const attributes = (Array.isArray(item.attributes) ? item.attributes : []) as MlAttribute[];
  listing.attributes = mapAttributes(attributes);
  listing.brand = attrValue(attributes, "BRAND");
  listing.model = attrValue(attributes, "MODEL");

  // ---------- variações ----------
  const variations = Array.isArray(item.variations) ? (item.variations as Json[]) : [];
  listing.variations = variations
    .map((v) => {
      const combos = Array.isArray(v.attribute_combinations) ? (v.attribute_combinations as Json[]) : [];
      const label = combos
        .map((c) => `${str(c.name) ?? ""}: ${str(c.value_name) ?? ""}`.trim())
        .filter((s) => s.length > 2)
        .join(", ");
      const qty = num(v.available_quantity);
      return label ? `${label}${qty ? ` (${qty} disponíveis)` : ""}` : null;
    })
    .filter((v): v is string => v !== null)
    .slice(0, 30);

  // ---------- estoque / vendedor / categoria ----------
  const stock = num(item.available_quantity);
  listing.stock = stock;

  const sellerId = num(item.seller_id);
  if (sellerId) {
    const seller = await apiGet(`/users/${sellerId}`, token, "seller", log);
    listing.seller = str(seller?.nickname);
  }

  const categoryId = str(item.category_id);
  if (categoryId) {
    const category = await apiGet(`/categories/${categoryId}`, token, "category", log);
    listing.category = str(category?.name);
  }

  return { ok: Boolean(listing.title), listing, log, missing: missingFields(listing), error: null };
}
