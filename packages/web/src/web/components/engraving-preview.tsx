import { useEffect, useState } from "react";
import opentype from "opentype.js";
import { engravingFamily, engravingFonts } from "../../shared/engraving-fonts";
const fonts = new Map<string, Promise<opentype.Font>>();
export function EngravingPreview({ name, fontId, inverted = false }: { name: string; fontId: string; inverted?: boolean }) {
  const [geometry, setGeometry] = useState<{ path: string; box: string } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false; setGeometry(null);setError(false);
    const entry = engravingFonts.find(f => f.id === fontId);
    if (!entry?.file || !name.trim()) return;
    if (!fonts.has(fontId)) fonts.set(fontId, fetch(`/fonts/engraving/${entry.file}`).then(r => { if (!r.ok) throw Error(); return r.arrayBuffer(); }).then(b => opentype.parse(b)));
    fonts.get(fontId)!.then(f => {
      if ([...name].some(c => c !== " " && !f.charToGlyphIndex(c))) throw Error();
      const path = f.getPath(name, 0, 0, 100, { kerning: true });const b = path.getBoundingBox();
      if (!cancelled) setGeometry({path: path.toPathData(5), box: `${b.x1-5} ${b.y1-5} ${b.x2-b.x1+10} ${b.y2-b.y1+10}`});
    }).catch(() => {if (!cancelled) setError(true);});
    return () => {cancelled = true;};
  }, [name, fontId]);
  return <div className={`rl-engraving-preview ${inverted ? "inverted" : ""}`} aria-label={`Prévia de ${name} em ${engravingFonts.find(f => f.id === fontId)?.name}`}>
    {geometry ? <svg role="img" viewBox={geometry.box}><path d={geometry.path} fill="currentColor" /></svg> : fontId === "arial" ? <span style={{fontFamily: engravingFamily(fontId)}}>{name || "Seu nome aqui"}</span> : <span className="preview-loading">{error ? "Caractere indisponível nesta fonte. Escolha outra." : name.trim() ? "Preparando prévia…" : "Seu nome aqui"}</span>}
  </div>;
}