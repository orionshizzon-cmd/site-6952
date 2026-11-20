import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  /** Caminho canônico, ex: "/produtos". Default: rota atual. */
  path?: string;
  image?: string;
  /** JSON-LD (schema.org) a injetar na página. */
  jsonLd?: object | object[];
};

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Gerencia <title>, meta description, canonical, Open Graph e JSON-LD por página.
export function Seo({ title, description, path, image = "/og-image.png", jsonLd }: SeoProps) {
  useEffect(() => {
    const origin = window.location.origin;
    const canonical = origin + (path ?? window.location.pathname);
    const absImage = image.startsWith("http") ? image : origin + image;

    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertLink("canonical", canonical);

    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    upsertMeta('meta[property="og:image"]', "property", "og:image", absImage);
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");

    let ld: HTMLScriptElement | null = null;
    if (jsonLd) {
      ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.setAttribute("data-seo", "page");
      ld.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(ld);
    }
    return () => {
      if (ld) ld.remove();
    };
  }, [title, description, path, image, jsonLd]);

  return null;
}

// Dados estruturados LocalBusiness reutilizáveis.
export const LOCAL_BUSINESS_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Rafa Laser",
  description:
    "Gravação a laser e presentes personalizados em Imperatriz-MA. Garrafas, copos, canivetes, chaveiros, canetas e fotogravação.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Principal, 173, Parque Vitória",
    addressLocality: "Imperatriz",
    addressRegion: "MA",
    postalCode: "65915-784",
    addressCountry: "BR",
  },
  telephone: "+5599991553836",
  areaServed: "Imperatriz e região, Maranhão",
  sameAs: ["https://instagram.com/rafa.laser"],
} as const;
