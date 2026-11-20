import { create, type Font } from "fontkit";

export function parseEngravingFont(bytes: Uint8Array): Font {
  const font = create(bytes as unknown as Parameters<typeof create>[0]);
  if (!("layout" in font)) throw Error("Arquivo de fonte inválido.");
  return font;
}
export function engravingGeometry(font: Font, name: string) {
  for (const ch of name) {
    if (ch !== " " && !font.hasGlyphForCodePoint(ch.codePointAt(0)!)) throw Error(`A fonte não contém o caractere “${ch}”. Escolha outra fonte.`);
  }
  // OpenType shaping includes kerning, ligatures, mark positioning and contextual substitutions.
  const run = font.layout(name, { kern: true, liga: true, clig: true, calt: true });
  let x = 0, y = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const parts: string[] = [];
  run.glyphs.forEach((glyph, i) => {
    if (glyph.id === 0) throw Error("Falha na composição: um caractere não pôde ser desenhado.");
    const p = run.positions[i];
    if (glyph.path.commands.length) {
      const path = glyph.path.transform(1, 0, 0, -1, x + p.xOffset, -(y + p.yOffset));
      const b = path.bbox;
      minX = Math.min(minX,b.minX); minY = Math.min(minY,b.minY); maxX = Math.max(maxX,b.maxX); maxY = Math.max(maxY,b.maxY);
      parts.push(path.toSVG());
    }
    x += p.xAdvance; y += p.yAdvance;
  });
  if (![minX,minY,maxX,maxY].every(Number.isFinite) || maxX<=minX || maxY<=minY) throw Error("O nome não gerou geometria válida.");
  return { path: parts.join(""), minX,minY,width:maxX-minX,height:maxY-minY };
}