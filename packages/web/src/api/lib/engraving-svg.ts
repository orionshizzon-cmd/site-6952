import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Font } from "fontkit";
import { ORPCError } from "@orpc/server";
import { findEngravingFont } from "../../shared/engraving-fonts";
import { parseEngravingFont, engravingGeometry } from "../../shared/engraving-geometry";

const cache = new Map<string, Font>();
export async function engravingSvg(name: string, fontId: string, widthMm: number, marginMm = 0, scalePct = 100) {
  const entry = findEngravingFont(fontId);
  if (!entry?.file) throw new ORPCError("BAD_REQUEST", { message: "Arial exige um arquivo licenciado da fonte. A exportação está indisponível; escolha outra fonte. Não substituímos Arial automaticamente." });
  let font = cache.get(fontId);
  if (!font) {
    // Development keeps assets in public; Vite copies them into dist for publication.
    // Do not rely on import.meta.url: SSR and the deployment bundle rewrite it.
    const relative = `public/fonts/engraving/${entry.file}`;
    const builtRelative = `dist/fonts/engraving/${entry.file}`;
    const location = [
      resolve(builtRelative),
      resolve("packages/web", builtRelative),
      resolve("../dist/fonts/engraving", entry.file),
      resolve(relative),
      resolve("packages/web", relative),
    ].find(existsSync);
    if (!location) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Arquivo da fonte indisponível no servidor." });
    const bytes = await readFile(location);
    font = parseEngravingFont(bytes);
    cache.set(fontId, font);
  }
  if (widthMm <= 2*marginMm) throw new ORPCError("BAD_REQUEST", {message:"A largura precisa ser maior que duas margens de segurança."});
  let g: ReturnType<typeof engravingGeometry>;
  try { g = engravingGeometry(font, name); } catch (error) { throw new ORPCError("BAD_REQUEST", {message:(error as Error).message}); }
  const inkWidthMm = (widthMm-2*marginMm)*scalePct/100;
  const scale = inkWidthMm/g.width, inkHeightMm = g.height*scale, heightMm = inkHeightMm+2*marginMm;
  const dx = (widthMm-inkWidthMm)/2-scale*g.minX, dy = marginMm-scale*g.minY;
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm.toFixed(5)}mm" viewBox="0 0 ${widthMm} ${heightMm.toFixed(5)}"><path fill="#000000" d="${g.path}" transform="matrix(${scale} 0 0 ${scale} ${dx} ${dy})"/></svg>`,widthMm,heightMm,inkWidthMm,inkHeightMm,fontName:entry.name};
}