import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createGateway, generateObject } from "ai";
import { z } from "zod";
import { importFromMercadoLivre } from "./adapter-mercadolivre";
import { importFromShopee } from "./adapter-shopee";
import { BROWSER_HEADERS, PROVIDER_LABEL, loadPage, unblockProvider } from "./listing-fetch";
import { STORE_LABEL, type StoreFacts, detectStore, extractStoreFacts, factsSummary, normalizeUrl } from "./listing-stores";
import {
  type AdapterResult,
  MARKETPLACE_LABEL,
  type MarketplaceId,
  type MarketplaceListing,
  attributesToSpecs,
  formatDiagnostics,
  listingFactsText,
} from "./marketplace";
import { s3 } from "./s3";

const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

/** Modelo que organiza o conteúdo da página em campos de produto. */
const STRUCT_MODEL = "google/gemini-3-flash";
/** Modelo com acesso à web — usado quando a loja bloqueia a leitura direta. */
const WEB_MODEL = "perplexity/sonar";

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 24_000;

export const listingSchema = z.object({
  name: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  brand: z.string().nullable(),
  /** Preço à vista/promocional em reais. */
  priceBrl: z.number().nullable(),
  /** Preço "de" (antes do desconto) em reais. */
  originalPriceBrl: z.number().nullable(),
  /** Ficha técnica em linhas "Campo: valor". */
  specs: z.string().nullable(),
  /** Cores citadas no anúncio, separadas por vírgula. */
  colors: z.string().nullable(),
  /** Fotos do produto, URLs absolutas, da principal para a menos importante. */
  imageUrls: z.array(z.string()).default([]),
  /** O que não foi encontrado na página. */
  warnings: z.array(z.string()).default([]),
});

export type ListingData = z.infer<typeof listingSchema>;

const SYSTEM = `Você copia anúncios de produtos da internet para o catálogo da Rafa Laser,
uma loja brasileira de presentes personalizados e gravação a laser.

REGRAS ABSOLUTAS:
- Use SOMENTE informações presentes no conteúdo da página recebido. NUNCA invente dados.
- Quando um dado não estiver na página, devolva null (ou lista vazia) e registre em "warnings".
- Os "DADOS EXTRAÍDOS DA LOJA" são confiáveis: use-os como verdade e não os contradiga.
- name: nome comercial limpo do produto, sem SEO repetido, sem "FRETE GRÁTIS", sem emoji, máximo 90 caracteres.
- shortDescription: uma frase de venda com até 140 caracteres.
- description: descrição completa em português do Brasil, 2 a 4 parágrafos curtos,
  reescrita com as informações reais do anúncio (nunca copie texto promocional de outra loja,
  nunca cite o nome da loja de origem, nunca cite prazo de entrega de outra loja).
- specs: ficha técnica em linhas "Campo: valor" (material, medidas, peso, conteúdo da embalagem, voltagem...).
- priceBrl / originalPriceBrl: números em reais, sem símbolo, ponto decimal. Preço de 1 unidade.
- imageUrls: apenas fotos do PRODUTO em URL absoluta e na maior resolução disponível.
  Ignore logotipos, ícones, banners da loja, selos de pagamento, avatar de vendedor e imagens de outros produtos.
- category: categoria curta em português (ex.: "Canecas", "Garrafas", "Eletrônicos", "Pet", "Escritório").`;

function absolutize(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const JUNK = [
  "logo",
  "sprite",
  "icon",
  "favicon",
  "placeholder",
  "avatar",
  "banner",
  "selo",
  "pixel",
  "loading",
  "spinner",
  "1x1",
  "blank",
];

function looksLikeProductImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return false;
  if (lower.endsWith(".svg") || lower.includes(".svg?")) return false;
  if (JUNK.some((j) => lower.includes(j))) return false;
  return /\.(jpe?g|png|webp|avif)(\?|$)/.test(lower) || lower.includes("/image");
}

/** Lojas servem miniaturas; tenta subir para a versão grande. */
function upgradeResolution(url: string): string {
  return url
    .replace(/-([IVSCQMN])\.(jpg|jpeg|png|webp)/i, "-F.$2")
    .replace(/_(\d{2,3})x(\d{2,3})(\.|_)/, "_800x800$3");
}

type PageContent = {
  html: string;
  text: string;
  jsonLd: string;
  metaImages: string[];
  htmlImages: string[];
  title: string | null;
};

function parseHtml(html: string, base: string): PageContent {
  // JSON-LD (schema.org/Product) — a fonte mais confiável quando existe
  const jsonLdBlocks: string[] = [];
  const ldRe = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(html)) !== null) {
    const block = m[1].trim();
    if (block.length < 20_000) jsonLdBlocks.push(block);
  }

  // Meta tags de imagem (og:image, twitter:image) e título
  const metaImages: string[] = [];
  const metaRe = /<meta[^>]+(?:property|name)=["'](og:image(?::secure_url)?|twitter:image)["'][^>]*>/gi;
  while ((m = metaRe.exec(html)) !== null) {
    const content = /content=["']([^"']+)["']/i.exec(m[0]);
    if (content) {
      const abs = absolutize(content[1], base);
      if (abs) metaImages.push(abs);
    }
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const ogTitle = /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html);
  const ogDesc = /<meta[^>]+(?:property|name)=["']og:description["'][^>]*content=["']([^"']+)["']/i.exec(html);

  // Imagens do corpo (src, data-src, data-zoom-image, srcset)
  const htmlImages: string[] = [];
  const imgRe = /<img[^>]+>/gi;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const candidates =
      tag.match(/(?:data-zoom-image|data-large|data-src|data-original|src)=["']([^"']+)["']/gi) ?? [];
    for (const c of candidates) {
      const value = /=["']([^"']+)["']/.exec(c)?.[1];
      if (!value) continue;
      const abs = absolutize(value.split(" ")[0], base);
      if (abs && looksLikeProductImage(abs)) htmlImages.push(upgradeResolution(abs));
    }
  }
  // URLs de imagem soltas no JSON embutido da página (lojas modernas usam isso)
  const rawRe = /https?:\/\/[^"'\\\s]+\.(?:jpe?g|png|webp|avif)/gi;
  const raw = html.match(rawRe) ?? [];
  for (const r of raw.slice(0, 400)) {
    if (looksLikeProductImage(r)) htmlImages.push(upgradeResolution(r));
  }

  // Texto legível da página (para a IA entender o anúncio)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  const head = [ogTitle ? `og:title: ${ogTitle[1]}` : null, ogDesc ? `og:description: ${ogDesc[1]}` : null]
    .filter(Boolean)
    .join("\n");

  return {
    html,
    text: `${head}\n\n${text}`.slice(0, MAX_TEXT_CHARS),
    jsonLd: jsonLdBlocks.join("\n---\n").slice(0, MAX_TEXT_CHARS),
    metaImages,
    htmlImages,
    title: titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : null,
  };
}

function storeFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Organiza o conteúdo da página em campos de produto com a IA. */
async function structure(url: string, page: PageContent, facts: StoreFacts): Promise<ListingData | null> {
  const candidates = dedupe([...facts.imageUrls, ...page.metaImages, ...page.htmlImages]).slice(0, 40);
  const prompt = `URL do anúncio: ${url}
Loja de origem: ${storeFromUrl(url) ?? "desconhecida"}
Título da página: ${page.title ?? "—"}

== DADOS EXTRAÍDOS DA LOJA (confiáveis) ==
${factsSummary(facts)}

== DADOS ESTRUTURADOS (JSON-LD) ==
${page.jsonLd || "(a página não trouxe JSON-LD)"}

== URLS DE IMAGEM ENCONTRADAS NA PÁGINA ==
${candidates.length ? candidates.join("\n") : "(nenhuma)"}

== TEXTO DA PÁGINA ==
${page.text || "(vazio)"}

Devolva os campos do produto. Em imageUrls use apenas URLs da lista acima que sejam fotos do produto.`;

  try {
    const { object } = await generateObject({
      model: gateway(STRUCT_MODEL),
      schema: listingSchema,
      system: SYSTEM,
      prompt,
    });
    return object;
  } catch {
    return null;
  }
}

/** Plano B: a loja bloqueou a leitura, então uma IA com acesso à web lê o anúncio. */
async function structureViaWeb(url: string): Promise<ListingData | null> {
  try {
    const { object } = await generateObject({
      model: gateway(WEB_MODEL),
      schema: listingSchema,
      system: SYSTEM,
      prompt: `Abra este anúncio e copie as informações reais do produto: ${url}

Se não conseguir abrir a página, devolva name vazio e explique em warnings.
Em imageUrls coloque apenas URLs de fotos do produto que você realmente viu na página.`,
    });
    return object;
  } catch {
    return null;
  }
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function extFromType(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

/** Baixa as fotos do anúncio e guarda no storage da loja. */
async function saveImages(
  urls: string[],
  referer: string,
): Promise<{ key: string; source: string | null; selected: boolean }[]> {
  const saved: { key: string; source: string | null; selected: boolean }[] = [];
  for (const raw of urls) {
    if (saved.length >= MAX_IMAGES) break;
    try {
      const res = await fetch(raw, {
        signal: AbortSignal.timeout(20_000),
        headers: {
          "User-Agent": BROWSER_HEADERS["User-Agent"],
          Accept: "image/avif,image/webp,image/png,image/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9",
          Referer: referer,
        },
      });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      // Ignora ícones/thumbs minúsculos e arquivos gigantes
      if (buf.byteLength < 8_000 || buf.byteLength > MAX_IMAGE_BYTES) continue;
      const key = `imports/${Date.now()}-${saved.length}-${Math.random().toString(36).slice(2, 8)}.${extFromType(type)}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: buf,
          ContentType: type,
        }),
      );
      saved.push({ key, source: raw, selected: true });
    } catch {
      // foto inacessível: segue para a próxima
    }
  }
  return saved;
}

export type ImportOutcome = {
  ok: boolean;
  store: string | null;
  data: ListingData | null;
  images: { key: string; source: string | null; selected: boolean }[];
  warnings: string[];
  error: string | null;
  /** Dados no formato único quando um conector oficial foi usado. */
  official: MarketplaceListing | null;
  /** Log [IMPORT]/[API]/[RESULT] da importação. */
  diagnostics: string | null;
};

const EMPTY_FACTS: StoreFacts = {
  name: null,
  description: null,
  specs: null,
  brand: null,
  priceBrl: null,
  originalPriceBrl: null,
  colors: null,
  imageUrls: [],
};

/** Aviso de loja com muro anti-robô, com a instrução do que fazer. */
function blockedWarning(storeLabel: string | null): string {
  const provider = unblockProvider();
  const loja = storeLabel ?? "Esta loja";
  if (provider) {
    return `${loja} bloqueou a leitura mesmo pelo ${PROVIDER_LABEL[provider.provider]}. Os dados podem estar incompletos — confira e complete à mão.`;
  }
  return `${loja} bloqueia leitura automática. Sem um serviço de desbloqueio configurado (SCRAPINGBEE_API_KEY, SCRAPERAPI_KEY, ZENROWS_API_KEY ou FIRECRAWL_API_KEY no .env), fotos e preço desta loja precisam ser colocados à mão.`;
}

/** Escreve o anúncio da Rafa Laser em cima dos dados oficiais do marketplace. */
async function structureFromOfficial(listing: MarketplaceListing): Promise<ListingData | null> {
  const prompt = `Estes dados vieram da API oficial do marketplace e são a única fonte permitida.

== DADOS OFICIAIS DO ANÚNCIO ==
${listingFactsText(listing)}

Escreva o anúncio para o catálogo da Rafa Laser usando só essas informações:
- name: nome comercial limpo do produto.
- shortDescription: uma frase de venda.
- description: 2 a 4 parágrafos curtos, texto novo (não copie a descrição original).
- specs: ficha técnica em linhas "Campo: valor" com as características oficiais.
- category: categoria curta em português.
- colors: cores que aparecem nas características/variações, separadas por vírgula (null se não houver).
- imageUrls: deixe vazio.
- warnings: liste o que os dados oficiais não trouxeram.`;

  try {
    const { object } = await generateObject({
      model: gateway(STRUCT_MODEL),
      schema: listingSchema,
      system: SYSTEM,
      prompt,
    });
    return object;
  } catch {
    return null;
  }
}

/** Fallback mínimo quando a IA falha mas os dados oficiais existem. */
function dataFromOfficial(listing: MarketplaceListing): ListingData {
  return {
    name: (listing.title ?? "").slice(0, 120),
    shortDescription: (listing.title ?? "").slice(0, 140),
    description: listing.description ?? listing.title ?? "",
    category: listing.category,
    brand: listing.brand,
    priceBrl: listing.price,
    originalPriceBrl: listing.originalPrice,
    specs: attributesToSpecs(listing.attributes),
    colors: null,
    imageUrls: [],
    warnings: [],
  };
}

const MISSING_LABEL = "Campo não disponível pela fonte utilizada";

/** Copia um anúncio: conector oficial quando existe, senão leitura da página. */
export async function importListingFromUrl(rawUrl: string): Promise<ImportOutcome> {
  const url = await normalizeUrl(rawUrl);
  const storeId = detectStore(url);
  const store = storeId ? STORE_LABEL[storeId] : storeFromUrl(url);
  const warnings: string[] = [];

  // ---------- 1) conector oficial (Mercado Livre / Shopee) ----------
  const marketplace: MarketplaceId | null =
    storeId === "mercadolivre" || storeId === "shopee" ? storeId : null;

  let adapter: AdapterResult | null = null;
  if (marketplace === "mercadolivre") adapter = await importFromMercadoLivre(url);
  if (marketplace === "shopee") adapter = await importFromShopee(url);

  if (adapter && marketplace) {
    const diagnostics = formatDiagnostics({
      url,
      marketplace: MARKETPLACE_LABEL[marketplace],
      itemId: adapter.listing?.itemId ?? null,
      log: adapter.log,
      listing: adapter.listing,
    });
    console.log(`\n${diagnostics}\n`);

    const official = adapter.listing;
    if (adapter.ok && official?.title) {
      const data = (await structureFromOfficial(official)) ?? dataFromOfficial(official);

      // Os dados oficiais são a verdade — a IA só escreve o texto
      data.name = data.name.trim() || (official.title ?? "");
      data.priceBrl = official.price;
      data.originalPriceBrl = official.originalPrice;
      if (official.brand) data.brand = official.brand;
      const specs = attributesToSpecs(official.attributes);
      if (specs) data.specs = specs;
      if (official.category && !data.category) data.category = official.category;

      const images = await saveImages(official.images.slice(0, MAX_IMAGES * 2), url);

      warnings.push(
        `Dados lidos pela API oficial do ${MARKETPLACE_LABEL[marketplace]} (anúncio ${official.itemId ?? "?"}).`,
      );
      if (adapter.missing.length) {
        warnings.push(`${MISSING_LABEL} (API oficial do ${MARKETPLACE_LABEL[marketplace]}): ${adapter.missing.join(", ")}.`);
      }
      if (!images.length) {
        warnings.push(
          official.images.length
            ? "As fotos oficiais não puderam ser baixadas — envie as fotos manualmente."
            : "A fonte oficial não trouxe fotos — envie as fotos manualmente.",
        );
      }
      warnings.push(...(data.warnings ?? []));

      return {
        ok: true,
        store,
        data,
        images,
        warnings: dedupe(warnings),
        error: null,
        official,
        diagnostics,
      };
    }

    // Conector oficial não resolveu: registra o motivo exato e segue para o genérico
    const failed = adapter.log.filter((s) => !s.ok).at(-1);
    warnings.push(
      `API oficial do ${MARKETPLACE_LABEL[marketplace]} não entregou o anúncio${
        failed?.step ? ` na etapa "${failed.step}"` : ""
      }${failed?.status ? ` (HTTP ${failed.status})` : ""}${
        adapter.error ? `: ${adapter.error}` : failed?.message ? `: ${failed.message}` : "."
      }`,
    );
    const generic = await importGeneric(url, store, warnings);
    return { ...generic, diagnostics: `${diagnostics}\n\n[FALLBACK GENÉRICO]\nUSADO: sim` };
  }

  return { ...(await importGeneric(url, store, warnings)), diagnostics: null };
}

/** Leitura genérica da página (lojas sem conector oficial, ou como último recurso). */
async function importGeneric(
  url: string,
  store: string | null,
  warnings: string[],
): Promise<Omit<ImportOutcome, "diagnostics">> {
  const read = await loadPage(url);
  let facts: StoreFacts = EMPTY_FACTS;
  let page: PageContent | null = null;
  let data: ListingData | null = null;

  if (read.html) {
    page = parseHtml(read.html, url);
    const extracted = await extractStoreFacts(url, read.html);
    facts = extracted.facts;
    data = await structure(url, page, facts);
    if (read.blocked) warnings.push(blockedWarning(store));
    if (read.strategy === "desbloqueio") {
      const provider = unblockProvider();
      if (provider) warnings.push(`Página lida pelo ${PROVIDER_LABEL[provider.provider]} (consome créditos do serviço).`);
    }
  } else {
    warnings.push(
      read.blocked || read.status === 403 || read.status === 503
        ? blockedWarning(store)
        : `Não foi possível abrir a página${read.status ? ` (HTTP ${read.status})` : ""}${read.error ? `: ${read.error}` : "."}`,
    );
  }

  if (!data || !data.name.trim()) {
    // Shopee/AliExpress às vezes só respondem pela API interna; se nem isso veio,
    // a IA com acesso à web ainda consegue o texto do anúncio (sem fotos).
    warnings.push("A leitura da página não trouxe o produto. Tentamos por uma IA com acesso à web — confira tudo.");
    data = (await structureViaWeb(url)) ?? data;
  }

  if (!data || !data.name.trim()) {
    return {
      ok: false,
      store,
      data: null,
      images: [],
      warnings,
      error:
        read.error ??
        "Não conseguimos extrair o anúncio desta página. Copie as informações manualmente ou tente outro link.",
      official: null,
    };
  }

  // Os dados objetivos da loja valem mais que a leitura da IA
  if (facts.name && facts.name.length <= 90) data.name = data.name || facts.name;
  if (facts.priceBrl) data.priceBrl = facts.priceBrl;
  if (facts.originalPriceBrl && facts.originalPriceBrl > (data.priceBrl ?? 0)) {
    data.originalPriceBrl = facts.originalPriceBrl;
  }
  if (facts.brand && !data.brand) data.brand = facts.brand;
  if (facts.specs && !data.specs) data.specs = facts.specs;
  if (facts.colors && !data.colors) data.colors = facts.colors;

  // Fotos: primeiro as extraídas da loja, depois as escolhidas pela IA e as da página
  const fromAi = data.imageUrls
    .map((u) => absolutize(u, url))
    .filter((u): u is string => u !== null && looksLikeProductImage(u))
    .map(upgradeResolution);
  const candidates = dedupe([
    ...facts.imageUrls,
    ...fromAi,
    ...(page?.metaImages ?? []),
    ...(page?.htmlImages ?? []),
  ]).slice(0, 24);
  const images = await saveImages(candidates, url);

  if (!images.length) {
    warnings.push(
      candidates.length
        ? "As fotos encontradas não puderam ser baixadas (a loja bloqueia o download) — envie as fotos manualmente."
        : "Nenhuma foto do anúncio foi encontrada — envie as fotos manualmente.",
    );
  }
  if (data.priceBrl == null) warnings.push("O preço não foi encontrado na página — preencha à mão.");
  warnings.push(...(data.warnings ?? []));

  return { ok: true, store, data, images, warnings: dedupe(warnings), error: null, official: null };
}

/** "Gerar anúncio Rafa Laser": reescreve o texto comercial com os dados já conferidos. */
export async function rewriteListingCopy(input: {
  name: string;
  description: string;
  specs: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  variations: string | null;
  priceBrl: number | null;
}): Promise<{ name: string; shortDescription: string; description: string; specs: string | null } | null> {
  const facts = [
    `Nome atual: ${input.name}`,
    input.brand ? `Marca: ${input.brand}` : null,
    input.model ? `Modelo: ${input.model}` : null,
    input.category ? `Categoria: ${input.category}` : null,
    input.priceBrl != null ? `Preço: R$ ${input.priceBrl.toFixed(2)}` : null,
    input.variations ? `Variações: ${input.variations}` : null,
    input.specs ? `Ficha técnica:\n${input.specs}` : null,
    input.description ? `Descrição de referência:\n${input.description.slice(0, 5000)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: gateway(STRUCT_MODEL),
      schema: z.object({
        name: z.string(),
        shortDescription: z.string(),
        description: z.string(),
        specs: z.string().nullable(),
      }),
      system: `${SYSTEM}

Agora você escreve a versão COMERCIAL da Rafa Laser:
- Não copie literalmente trechos longos da descrição de terceiros: reescreva.
- Use somente os dados técnicos reais informados. Não invente medidas, materiais nem prazos.
- Fale do diferencial da Rafa Laser (gravação a laser personalizada, acabamento profissional) sem prometer nada que não esteja nos dados.`,
      prompt: `== DADOS CONFERIDOS DO PRODUTO ==
${facts}

Devolva name, shortDescription, description e specs (specs em linhas "Campo: valor", ou null se não houver dado técnico).`,
    });
    return object;
  } catch {
    return null;
  }
}
