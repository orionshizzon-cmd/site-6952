/**
 * Extração específica por loja.
 *
 * Cada marketplace guarda os dados do produto em um formato próprio dentro da
 * página. Aqui pegamos o que é objetivo (nome, preço, fotos, ficha técnica)
 * direto desses formatos — sem IA e sem chute. O que sobra de texto continua
 * sendo organizado pela IA depois.
 */

import { BROWSER_HEADERS, loadJson } from "./listing-fetch";

export type StoreId = "mercadolivre" | "amazon" | "shopee" | "aliexpress" | null;

export const STORE_LABEL: Record<Exclude<StoreId, null>, string> = {
  mercadolivre: "Mercado Livre",
  amazon: "Amazon",
  shopee: "Shopee",
  aliexpress: "AliExpress",
};

export type StoreFacts = {
  name: string | null;
  description: string | null;
  specs: string | null;
  brand: string | null;
  priceBrl: number | null;
  originalPriceBrl: number | null;
  colors: string | null;
  imageUrls: string[];
};

const EMPTY: StoreFacts = {
  name: null,
  description: null,
  specs: null,
  brand: null,
  priceBrl: null,
  originalPriceBrl: null,
  colors: null,
  imageUrls: [],
};

export function detectStore(url: string): StoreId {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host.includes("mercadolivre.com") || host.includes("mercadolibre.com") || host.includes("mlb.la")) {
    return "mercadolivre";
  }
  if (host.includes("amazon.")) return "amazon";
  if (host.includes("shopee.") || host.includes("shp.ee")) return "shopee";
  if (host.includes("aliexpress.") || host.includes("aliexpress.us") || host.includes("s.click.aliexpress")) {
    return "aliexpress";
  }
  return null;
}

/** Segue encurtadores e limpa parâmetros de rastreio do link colado. */
export async function normalizeUrl(raw: string): Promise<string> {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }

  const isShort =
    host.includes("shp.ee") ||
    host === "s.shopee.com.br" ||
    host.includes("mlb.la") ||
    host.includes("amzn.to") ||
    host.includes("a.co") ||
    host.includes("s.click.aliexpress.com");

  if (isShort) {
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
        headers: BROWSER_HEADERS,
      });
      if (res.url) url = res.url;
    } catch {
      // mantém o link original
    }
  }

  try {
    const u = new URL(url);
    const junk = [...u.searchParams.keys()].filter(
      (k) =>
        k.startsWith("utm_") ||
        k.startsWith("af_") ||
        ["ref", "ref_", "tag", "psc", "tid", "pd_rd_i", "sprefix", "smid", "th", "aff_fcid", "sourceType"].includes(k),
    );
    for (const k of junk) u.searchParams.delete(k);
    // Amazon: reduz para a URL canônica do produto
    const asin = /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i.exec(u.pathname)?.[1];
    if (u.hostname.includes("amazon.") && asin) return `${u.origin}/dp/${asin.toUpperCase()}`;
    return u.toString();
  } catch {
    return url;
  }
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length ? text : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const raw = value.replace(/[^\d.,]/g, "");
  if (!raw) return null;
  // formato brasileiro (1.234,56) x formato americano (1234.56)
  const normalized =
    raw.includes(",") && raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function uniq(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.split("?")[0];
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

// ─────────────────────────── Mercado Livre ───────────────────────────

/** Sobe a foto do Mercado Livre para a versão original (maior resolução). */
function mlOriginal(url: string): string {
  return url
    .replace(/\/D_(?:NQ_)?(?:NP_)?(?:2X_)?/, "/D_NQ_NP_2X_")
    .replace(/-[A-Z]\.(webp|jpg|jpeg|png)$/i, "-O.$1");
}

function fromMercadoLivre(html: string): StoreFacts {
  const facts: StoreFacts = { ...EMPTY, imageUrls: [] };

  facts.name =
    clean(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]) ??
    clean(/"(?:title|name)"\s*:\s*"([^"]{10,180})"/.exec(html)?.[1]);

  // Preço: JSON do estado da página, depois o bloco visual
  const priceJson = /"price"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/.exec(html)?.[1];
  const priceMeta = /itemprop="price"[^>]*content="([\d.,]+)"/i.exec(html)?.[1];
  const priceLd = /"price"\s*:\s*"?([\d]+\.?\d*)"?/.exec(html)?.[1];
  facts.priceBrl = toNumber(priceJson ?? priceMeta ?? priceLd ?? null);

  const original = /"original_price"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/.exec(html)?.[1];
  facts.originalPriceBrl = toNumber(original ?? null);

  facts.brand = clean(/"brand"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/.exec(html)?.[1]);

  // Ficha técnica: pares "nome"/"value_name" das especificações
  const specs: string[] = [];
  const specRe = /"(?:name|id)"\s*:\s*"([^"]{2,40})"\s*,\s*"value_name"\s*:\s*"([^"]{1,80})"/g;
  let m: RegExpExecArray | null;
  while ((m = specRe.exec(html)) !== null && specs.length < 30) {
    specs.push(`${m[1]}: ${m[2]}`);
  }
  facts.specs = specs.length ? uniq(specs).join("\n") : null;

  const descMatch =
    /<p[^>]*class="[^"]*ui-pdp-description__content[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(html)?.[1] ??
    /"plain_text"\s*:\s*"((?:[^"\\]|\\.){40,4000})"/.exec(html)?.[1];
  facts.description = clean(descMatch?.replace(/\\n/g, "\n").replace(/\\"/g, '"'));

  const imgs = html.match(/https:\/\/http2\.mlstatic\.com\/D_[A-Za-z0-9_-]+-[A-Z]\.(?:webp|jpg|jpeg|png)/g) ?? [];
  facts.imageUrls = uniq(imgs.map(mlOriginal)).slice(0, 12);

  return facts;
}

// ─────────────────────────────── Amazon ───────────────────────────────

function fromAmazon(html: string): StoreFacts {
  const facts: StoreFacts = { ...EMPTY, imageUrls: [] };

  facts.name = clean(/id="productTitle"[^>]*>([\s\S]*?)<\//i.exec(html)?.[1]);

  const priceAmount = /"priceAmount"\s*:\s*([\d.]+)/.exec(html)?.[1];
  const offscreen = /class="a-offscreen"[^>]*>\s*R\$\s*([\d.,]+)/i.exec(html)?.[1];
  const priceToPay = /id="sns-base-price"[^>]*>\s*R\$\s*([\d.,]+)/i.exec(html)?.[1];
  facts.priceBrl = toNumber(priceAmount ?? offscreen ?? priceToPay ?? null);

  const listPrice = /"strikeThroughPrice"[\s\S]{0,120}?R\$\s*([\d.,]+)/i.exec(html)?.[1];
  facts.originalPriceBrl = toNumber(listPrice ?? null);

  facts.brand =
    clean(/id="bylineInfo"[^>]*>([\s\S]*?)<\//i.exec(html)?.[1])?.replace(/^(Visite a loja|Marca:)\s*/i, "") ?? null;

  // Bullets de destaque = descrição curta confiável
  const bulletsBlock = /id="feature-bullets"([\s\S]*?)<\/div>\s*<\/div>/i.exec(html)?.[1] ?? "";
  const bullets = [...bulletsBlock.matchAll(/<span[^>]*class="a-list-item"[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((b) => clean(b[1]))
    .filter((b): b is string => b !== null && b.length > 3);
  const productDesc = clean(
    /id="productDescription"[\s\S]{0,40}?>([\s\S]*?)<\/div>/i.exec(html)?.[1] ?? null,
  );
  facts.description = [bullets.map((b) => `• ${b}`).join("\n"), productDesc].filter(Boolean).join("\n\n") || null;

  // Ficha técnica: tabela de detalhes do produto
  const specs: string[] = [];
  const rowRe = /<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null && specs.length < 30) {
    const key = clean(m[1]);
    const value = clean(m[2]);
    if (key && value && key.length < 45 && value.length < 120) specs.push(`${key}: ${value}`);
  }
  facts.specs = specs.length ? uniq(specs).join("\n") : null;

  // Fotos: hiRes do bloco de imagens, depois data-a-dynamic-image
  const hiRes = [...html.matchAll(/"(?:hiRes|large)"\s*:\s*"(https:\/\/[^"]+?\.(?:jpg|jpeg|png|webp))"/g)].map(
    (x) => x[1],
  );
  const dynamic = [
    ...html.matchAll(/data-a-dynamic-image="([^"]+)"/g),
  ].flatMap((x) => [...x[1].matchAll(/(https:\/\/[^"&]+?\.(?:jpg|jpeg|png|webp))/g)].map((y) => y[1]));
  const landing = /id="landingImage"[^>]*src="([^"]+)"/i.exec(html)?.[1];
  facts.imageUrls = uniq(
    [...hiRes, ...dynamic, landing ?? ""]
      .filter(Boolean)
      .filter((u) => u.includes("/images/I/"))
      .map((u) => u.replace(/\._[A-Z0-9_,]+_\./i, "._AC_SL1500_.")),
  ).slice(0, 12);

  return facts;
}

// ─────────────────────────────── Shopee ───────────────────────────────

export function shopeeIds(url: string): { itemId: string; shopId: string } | null {
  const m = /i\.(\d+)\.(\d+)/.exec(url);
  if (!m) return null;
  return { shopId: m[1], itemId: m[2] };
}

const SHOPEE_IMG = "https://down-br.img.susercontent.com/file/";

type ShopeeItem = {
  title?: string;
  description?: string;
  brand?: string;
  price?: number;
  price_before_discount?: number;
  image?: string;
  images?: string[];
  attributes?: { name?: string; value?: string }[];
  tier_variations?: { name?: string; options?: string[] }[];
};

/** A Shopee monta a página por JavaScript; a API interna devolve o produto. */
async function fromShopee(url: string, html: string): Promise<StoreFacts> {
  const facts: StoreFacts = { ...EMPTY, imageUrls: [] };
  const ids = shopeeIds(url);

  if (ids) {
    const api = (await loadJson(
      `https://shopee.com.br/api/v4/pdp/get_pc?item_id=${ids.itemId}&shop_id=${ids.shopId}`,
      { referer: url, "x-api-source": "pc", "af-ac-enc-dat": "null", "x-shopee-language": "pt-BR" },
    )) as { data?: { item?: ShopeeItem; product_price?: { price?: { single_value?: number } } } } | null;

    const item = api?.data?.item;
    if (item) {
      facts.name = clean(item.title ?? null);
      facts.description = clean(item.description ?? null);
      facts.brand = clean(item.brand ?? null);
      const div = 100_000; // preços da Shopee vêm multiplicados
      const single = api?.data?.product_price?.price?.single_value;
      facts.priceBrl = item.price ? item.price / div : single ? single / div : null;
      facts.originalPriceBrl = item.price_before_discount ? item.price_before_discount / div : null;
      const hashes = [item.image ?? "", ...(item.images ?? [])].filter(Boolean);
      facts.imageUrls = uniq(hashes.map((h) => (h.startsWith("http") ? h : `${SHOPEE_IMG}${h}`))).slice(0, 12);
      const specs = (item.attributes ?? [])
        .filter((a) => a?.name && a?.value)
        .map((a) => `${a.name}: ${a.value}`);
      facts.specs = specs.length ? specs.join("\n") : null;
      const colorTier = (item.tier_variations ?? []).find((t) => /cor|color/i.test(t?.name ?? ""));
      facts.colors = colorTier?.options?.length ? colorTier.options.join(", ") : null;
      return facts;
    }
  }

  // Sem API: tenta o que houver no HTML (quando lido com navegador real)
  facts.name = clean(
    /<meta[^>]+property="og:title"[^>]*content="([^"]+)"/i.exec(html)?.[1] ??
      /<div[^>]*class="[^"]*_44qnta[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1] ??
      null,
  );
  facts.description = clean(
    /<meta[^>]+property="og:description"[^>]*content="([^"]+)"/i.exec(html)?.[1] ?? null,
  );
  facts.priceBrl = toNumber(/R\$\s?([\d.]+,\d{2})/.exec(html)?.[1] ?? null);
  const imgs = html.match(/https:\/\/(?:down-br|down-cvs-br|cf)\.img\.susercontent\.com\/file\/[A-Za-z0-9_-]+/g) ?? [];
  facts.imageUrls = uniq(imgs).slice(0, 12);
  return facts;
}

// ────────────────────────────── AliExpress ──────────────────────────────

function fromAliExpress(html: string): StoreFacts {
  const facts: StoreFacts = { ...EMPTY, imageUrls: [] };

  facts.name = clean(
    /"subject"\s*:\s*"((?:[^"\\]|\\.){5,200})"/.exec(html)?.[1] ??
      /<meta[^>]+property="og:title"[^>]*content="([^"]+)"/i.exec(html)?.[1] ??
      /<title[^>]*>([\s\S]{5,200}?)<\/title>/i.exec(html)?.[1] ??
      null,
  );

  // Preço: AliExpress usa vários campos; pega o primeiro em reais
  const money = /"(?:formatedActivityPrice|formatedPrice|minActivityAmount|minAmount)"\s*:\s*"?(?:\{[^}]*"formatedAmount"\s*:\s*")?R\$\s*([\d.,]+)/.exec(
    html,
  )?.[1];
  const amount = /"minActivityAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/.exec(html)?.[1];
  facts.priceBrl = toNumber(money ?? amount ?? null);
  const origin = /"originalPrice"[\s\S]{0,80}?"value"\s*:\s*([\d.]+)/.exec(html)?.[1];
  facts.originalPriceBrl = toNumber(origin ?? null);

  // Fotos: lista de imagens do produto + imagens soltas do CDN
  const list = /"imagePathList"\s*:\s*\[([^\]]+)\]/.exec(html)?.[1] ?? "";
  const fromList = [...list.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  const loose =
    html.match(/https:\/\/(?:ae0\d|ae-pic-a\d)\.(?:alicdn|aliexpress-media)\.com\/kf\/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp)/g) ??
    [];
  facts.imageUrls = uniq(
    [...fromList, ...loose]
      .map((u) => (u.startsWith("//") ? `https:${u}` : u))
      .filter((u) => u.startsWith("http"))
      // remove os recortes pequenos (ex.: _50x50.jpg, /150x150.gif)
      .map((u) => u.replace(/_\d{2,3}x\d{2,3}(?:q\d{2})?(\.(?:jpg|jpeg|png|webp))/i, "$1"))
      .filter((u) => !/\/\d{2,3}x\d{2,3}\./.test(u)),
  ).slice(0, 12);

  const specs: string[] = [];
  const specRe = /"attrName"\s*:\s*"([^"]{2,40})"\s*,\s*"attrValue"\s*:\s*"([^"]{1,80})"/g;
  let m: RegExpExecArray | null;
  while ((m = specRe.exec(html)) !== null && specs.length < 30) specs.push(`${m[1]}: ${m[2]}`);
  facts.specs = specs.length ? uniq(specs).join("\n") : null;

  return facts;
}

// ─────────────────────────────── genérico ───────────────────────────────

/** Lojas comuns (Shopify, WooCommerce, Nuvemshop...) publicam JSON-LD. */
function fromJsonLd(html: string): StoreFacts {
  const facts: StoreFacts = { ...EMPTY, imageUrls: [] };
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.trim());
    } catch {
      continue;
    }
    const nodes: Record<string, unknown>[] = [];
    const push = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(push);
      else if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        nodes.push(obj);
        if (obj["@graph"]) push(obj["@graph"]);
      }
    };
    push(parsed);
    const product = nodes.find((n) => {
      const type = n["@type"];
      return typeof type === "string" ? type === "Product" : Array.isArray(type) && type.includes("Product");
    });
    if (!product) continue;

    facts.name = clean(typeof product.name === "string" ? product.name : null) ?? facts.name;
    facts.description = clean(typeof product.description === "string" ? product.description : null) ?? facts.description;
    const brand = product.brand;
    facts.brand =
      clean(
        typeof brand === "string"
          ? brand
          : brand && typeof brand === "object"
            ? ((brand as Record<string, unknown>).name as string) ?? null
            : null,
      ) ?? facts.brand;

    const image = product.image;
    const imgs = Array.isArray(image)
      ? image.filter((i): i is string => typeof i === "string")
      : typeof image === "string"
        ? [image]
        : [];
    if (imgs.length) facts.imageUrls = uniq([...facts.imageUrls, ...imgs]).slice(0, 12);

    const offersRaw = product.offers;
    const offers = Array.isArray(offersRaw) ? offersRaw : offersRaw ? [offersRaw] : [];
    for (const offer of offers) {
      if (!offer || typeof offer !== "object") continue;
      const o = offer as Record<string, unknown>;
      const price = toNumber(o.price ?? o.lowPrice ?? null);
      if (price && !facts.priceBrl) facts.priceBrl = price;
    }
    break;
  }
  return facts;
}

/** Junta o que a loja informou de forma objetiva, com a base do JSON-LD. */
export async function extractStoreFacts(url: string, html: string): Promise<{ store: StoreId; facts: StoreFacts }> {
  const store = detectStore(url);
  const base = fromJsonLd(html);
  let specific: StoreFacts = { ...EMPTY, imageUrls: [] };

  if (store === "mercadolivre") specific = fromMercadoLivre(html);
  else if (store === "amazon") specific = fromAmazon(html);
  else if (store === "shopee") specific = await fromShopee(url, html);
  else if (store === "aliexpress") specific = fromAliExpress(html);

  const merged: StoreFacts = {
    name: specific.name ?? base.name,
    description: specific.description ?? base.description,
    specs: specific.specs ?? base.specs,
    brand: specific.brand ?? base.brand,
    priceBrl: specific.priceBrl ?? base.priceBrl,
    originalPriceBrl: specific.originalPriceBrl ?? base.originalPriceBrl,
    colors: specific.colors ?? base.colors,
    imageUrls: uniq([...specific.imageUrls, ...base.imageUrls]).slice(0, 14),
  };
  return { store, facts: merged };
}

export function factsSummary(facts: StoreFacts): string {
  const lines = [
    facts.name ? `nome: ${facts.name}` : null,
    facts.brand ? `marca: ${facts.brand}` : null,
    facts.priceBrl ? `preço: R$ ${facts.priceBrl.toFixed(2)}` : null,
    facts.originalPriceBrl ? `preço original: R$ ${facts.originalPriceBrl.toFixed(2)}` : null,
    facts.colors ? `cores: ${facts.colors}` : null,
    facts.specs ? `ficha técnica:\n${facts.specs}` : null,
    facts.description ? `descrição do anúncio:\n${facts.description.slice(0, 4000)}` : null,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "(nada extraído de forma objetiva)";
}
