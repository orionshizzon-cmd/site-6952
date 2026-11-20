/**
 * Camada de leitura de páginas de anúncio.
 *
 * Lojas grandes (Mercado Livre, Amazon, Shopee, AliExpress) bloqueiam leitura
 * feita por servidor: devolvem muro de verificação, captcha ou erro 403/503.
 * Por isso a leitura acontece em cascata:
 *   1. leitura direta (funciona em sites de fornecedor, Shopify, WooCommerce...)
 *   2. serviço de desbloqueio (ScrapingBee / ScraperAPI / ZenRows / Firecrawl),
 *      quando a chave estiver configurada no .env
 *   3. quem chama cai para a IA com acesso à web (só texto, sem fotos)
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Ch-Ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

/** Algumas lojas só entregam a página real para navegador de celular. */
export const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

export const MOBILE_HEADERS: Record<string, string> = {
  "User-Agent": MOBILE_UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Upgrade-Insecure-Requests": "1",
};

export type ReadStrategy = "direto" | "celular" | "desbloqueio";

export type PageRead = {
  ok: boolean;
  html: string;
  status: number | null;
  strategy: ReadStrategy | null;
  /** A página veio, mas era muro de verificação / captcha. */
  blocked: boolean;
  error: string | null;
};

/** Sinais de que a loja devolveu muro anti-robô em vez do anúncio. */
const BLOCK_SIGNS = [
  "account-verification",
  "gz/account-verification",
  "just a moment",
  "cf-browser-verification",
  "cf_chl_opt",
  "captcha",
  "px-captcha",
  "recaptcha",
  "punish?",
  "are you a human",
  "verifique que você é humano",
  "digite os caracteres",
  "enter the characters you see below",
  "robot check",
  "serviço indisponível",
  "service unavailable",
  "acesso negado",
  "access denied",
  "request blocked",
];

const BLOCK_TITLES = [
  "mercado libre",
  "mercado livre",
  "shopee brasil | ofertas incríveis. melhores preços do mercado",
  "just a moment...",
  "robot check",
  "amazon.com.br",
  "503 - erro de serviço indisponível",
];

function titleOf(html: string): string {
  return (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Decide se o HTML recebido é o anúncio de verdade ou um muro de verificação. */
export function looksBlocked(html: string): boolean {
  if (!html) return true;
  const lower = html.toLowerCase();
  // Página muito curta nunca é uma página de produto real
  if (lower.length < 15_000) return true;
  const title = titleOf(html);
  if (title && BLOCK_TITLES.includes(title)) return true;
  const hasProductSignal =
    lower.includes('"@type":"product"') ||
    lower.includes('property="product:price') ||
    lower.includes('id="producttitle"') ||
    lower.includes("data-a-hires") ||
    lower.includes("ui-pdp-price") ||
    /r\$\s?[\d.]+,\d{2}/.test(lower);
  if (hasProductSignal) return false;
  return BLOCK_SIGNS.some((sign) => lower.includes(sign));
}

/** Leitura direta, como um navegador comum. */
export async function directRead(url: string, extraHeaders: Record<string, string> = {}): Promise<PageRead> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
      headers: { ...BROWSER_HEADERS, ...extraHeaders },
    });
    const html = res.ok ? await res.text() : "";
    if (!res.ok) {
      return {
        ok: false,
        html: "",
        status: res.status,
        strategy: "direto",
        blocked: res.status === 403 || res.status === 503 || res.status === 429,
        error: `A loja respondeu HTTP ${res.status} para a leitura direta.`,
      };
    }
    const blocked = looksBlocked(html);
    return { ok: !blocked, html, status: res.status, strategy: "direto", blocked, error: null };
  } catch (err) {
    return {
      ok: false,
      html: "",
      status: null,
      strategy: "direto",
      blocked: false,
      error: err instanceof Error ? err.message : "Falha ao abrir a página.",
    };
  }
}

export type UnblockProvider = "scrapingbee" | "scraperapi" | "zenrows" | "firecrawl";

/** Qual serviço de desbloqueio está configurado no .env (se algum). */
export function unblockProvider(): { provider: UnblockProvider; key: string } | null {
  const table: [UnblockProvider, string | undefined][] = [
    ["scrapingbee", process.env.SCRAPINGBEE_API_KEY],
    ["scraperapi", process.env.SCRAPERAPI_KEY],
    ["zenrows", process.env.ZENROWS_API_KEY],
    ["firecrawl", process.env.FIRECRAWL_API_KEY],
  ];
  for (const [provider, key] of table) {
    if (key && key.trim().length > 8) return { provider, key: key.trim() };
  }
  return null;
}

export const PROVIDER_LABEL: Record<UnblockProvider, string> = {
  scrapingbee: "ScrapingBee",
  scraperapi: "ScraperAPI",
  zenrows: "ZenRows",
  firecrawl: "Firecrawl",
};

type UnblockOptions = {
  /** Executar o JavaScript da página (mais lento, gasta mais créditos). */
  render?: boolean;
  /** A resposta esperada é JSON de API, não HTML de página. */
  json?: boolean;
};

/** Lê a página por um serviço de desbloqueio (proxy residencial + navegador real). */
export async function unblockRead(url: string, opts: UnblockOptions = {}): Promise<PageRead> {
  const cfg = unblockProvider();
  if (!cfg) {
    return {
      ok: false,
      html: "",
      status: null,
      strategy: "desbloqueio",
      blocked: false,
      error: "Nenhum serviço de desbloqueio configurado.",
    };
  }
  const render = opts.render ?? !opts.json;

  try {
    let res: Response;
    if (cfg.provider === "scrapingbee") {
      const qs = new URLSearchParams({
        api_key: cfg.key,
        url,
        render_js: render ? "true" : "false",
        premium_proxy: "true",
        country_code: "br",
        block_resources: "true",
        wait: render ? "3000" : "0",
      });
      res = await fetch(`https://app.scrapingbee.com/api/v1/?${qs}`, { signal: AbortSignal.timeout(120_000) });
    } else if (cfg.provider === "scraperapi") {
      const qs = new URLSearchParams({
        api_key: cfg.key,
        url,
        render: render ? "true" : "false",
        country_code: "br",
        ultra_premium: "true",
      });
      res = await fetch(`https://api.scraperapi.com/?${qs}`, { signal: AbortSignal.timeout(120_000) });
    } else if (cfg.provider === "zenrows") {
      const qs = new URLSearchParams({
        apikey: cfg.key,
        url,
        js_render: render ? "true" : "false",
        premium_proxy: "true",
        proxy_country: "br",
      });
      res = await fetch(`https://api.zenrows.com/v1/?${qs}`, { signal: AbortSignal.timeout(120_000) });
    } else {
      res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        signal: AbortSignal.timeout(120_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({
          url,
          formats: ["rawHtml"],
          proxy: "stealth",
          location: { country: "BR", languages: ["pt-BR"] },
          waitFor: render ? 3000 : 0,
          onlyMainContent: false,
        }),
      });
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200).replace(/\s+/g, " ");
      return {
        ok: false,
        html: "",
        status: res.status,
        strategy: "desbloqueio",
        blocked: false,
        error: `${PROVIDER_LABEL[cfg.provider]} respondeu ${res.status}. ${detail}`,
      };
    }

    let html: string;
    if (cfg.provider === "firecrawl") {
      const body = (await res.json()) as { success?: boolean; data?: { rawHtml?: string }; error?: string };
      html = body?.data?.rawHtml ?? "";
      if (!html) {
        return {
          ok: false,
          html: "",
          status: res.status,
          strategy: "desbloqueio",
          blocked: false,
          error: `Firecrawl não devolveu o conteúdo. ${body?.error ?? ""}`.trim(),
        };
      }
    } else {
      html = await res.text();
    }

    const blocked = opts.json ? false : looksBlocked(html);
    return { ok: !blocked, html, status: res.status, strategy: "desbloqueio", blocked, error: null };
  } catch (err) {
    return {
      ok: false,
      html: "",
      status: null,
      strategy: "desbloqueio",
      blocked: false,
      error:
        err instanceof Error
          ? `${PROVIDER_LABEL[cfg.provider]}: ${err.message}`
          : "Falha no serviço de desbloqueio.",
    };
  }
}

/** Leitura como navegador de celular — passa onde a versão desktop é barrada. */
export async function mobileRead(url: string): Promise<PageRead> {
  const read = await directRead(url, MOBILE_HEADERS);
  return { ...read, strategy: "celular" };
}

/**
 * Lê a página do anúncio em cascata: leitura direta, versão de celular
 * (opcionalmente em outra URL) e, por fim, o serviço de desbloqueio.
 */
export async function loadPage(
  url: string,
  opts: { mobileUrl?: string; skipDesktop?: boolean } = {},
): Promise<PageRead> {
  const attempts: PageRead[] = [];

  if (!opts.skipDesktop) {
    const direct = await directRead(url);
    if (direct.ok) return direct;
    attempts.push(direct);
  }

  if (opts.mobileUrl || opts.skipDesktop) {
    const mobile = await mobileRead(opts.mobileUrl ?? url);
    if (mobile.ok) return mobile;
    attempts.push(mobile);
  }

  if (unblockProvider()) {
    const viaProvider = await unblockRead(url);
    if (viaProvider.ok) return viaProvider;
    attempts.push(viaProvider);
  }

  // nenhuma tentativa deu certo: devolve a que trouxe mais conteúdo
  return attempts.sort((a, b) => b.html.length - a.html.length)[0];
}

/** Lê um endpoint JSON (API interna de loja) direto ou pelo desbloqueio. */
export async function loadJson(url: string, headers: Record<string, string> = {}): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { ...BROWSER_HEADERS, Accept: "application/json,text/plain,*/*", ...headers },
    });
    if (res.ok) {
      const body = await res.json().catch(() => null);
      if (body && !JSON.stringify(body).includes("redirect_to_error_page")) return body;
    }
  } catch {
    // segue para o desbloqueio
  }
  if (!unblockProvider()) return null;
  const read = await unblockRead(url, { json: true });
  if (!read.html) return null;
  try {
    return JSON.parse(read.html) as unknown;
  } catch {
    const match = /\{[\s\S]*\}/.exec(read.html);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
}
