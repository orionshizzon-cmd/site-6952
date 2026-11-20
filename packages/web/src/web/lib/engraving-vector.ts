import { parse, type Font } from "opentype.js";
import { ENGRAVING_FONTS } from "./constants";

// Cache de fontes já carregadas (por URL do TTF)
const fontCache = new Map<string, Font>();

async function loadFont(ttfUrl: string): Promise<Font> {
  const cached = fontCache.get(ttfUrl);
  if (cached) return cached;
  const res = await fetch(ttfUrl);
  if (!res.ok) throw new Error(`Falha ao carregar a fonte: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const font = parse(buffer);
  fontCache.set(ttfUrl, font);
  return font;
}

const FONT_SIZE = 140;
const PADDING = 48;
const INK = "#111111";
const BG = "#ffffff";

function svgDocument(width: number, height: number, paths: string): string {
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${BG}"/><g fill="${INK}">${paths}</g></svg>`;
}

// Gera um SVG vetorizado (contornos reais) do nome na fonte e orientação escolhidas.
export async function generateEngravingSvg(opts: {
  text: string;
  fontLabel: string;
  orientation: "horizontal" | "vertical";
}): Promise<string> {
  const text = (opts.text || "").trim();
  const def = ENGRAVING_FONTS.find((f) => f.label === opts.fontLabel) ?? ENGRAVING_FONTS[0];
  const font = await loadFont(def.ttf);

  if (!text) {
    return svgDocument(PADDING * 2, PADDING * 2, "");
  }

  if (opts.orientation === "vertical") {
    const chars = [...text];
    const lineHeight = FONT_SIZE * 1.18;
    let maxWidth = 0;
    const widths = chars.map((ch) => {
      const glyph = font.charToGlyph(ch);
      const w = (glyph.advanceWidth / font.unitsPerEm) * FONT_SIZE;
      maxWidth = Math.max(maxWidth, w);
      return w;
    });
    const width = maxWidth + PADDING * 2;
    const height = lineHeight * chars.length + PADDING * 2;
    let paths = "";
    chars.forEach((ch, i) => {
      if (ch.trim() === "") return; // pula espaços em branco
      const w = widths[i];
      const x = PADDING + (maxWidth - w) / 2;
      const y = PADDING + lineHeight * (i + 0.82);
      paths += font.getPath(ch, x, y, FONT_SIZE).toSVG(2);
    });
    return svgDocument(width, height, paths);
  }

  // Horizontal
  const measure = font.getPath(text, 0, 0, FONT_SIZE);
  const bb = measure.getBoundingBox();
  const width = bb.x2 - bb.x1 + PADDING * 2;
  const height = bb.y2 - bb.y1 + PADDING * 2;
  const path = font.getPath(text, PADDING - bb.x1, PADDING - bb.y1, FONT_SIZE);
  return svgDocument(width, height, path.toSVG(2));
}

// Converte a string SVG em um data URL para preview inline
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
