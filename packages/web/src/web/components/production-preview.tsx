import { useEffect, useState } from "react";
import type { Font } from "fontkit";
import { engravingGeometry, parseEngravingFont } from "../../shared/engraving-geometry";
import { findEngravingFont, engravingFamily } from "../../shared/engraving-fonts";
const fonts=new Map<string,Promise<Font>>();
export function ProductionPreview({name,fontId,inverted=false,onValidity,onAspect,compact=false}:{name:string;fontId:string;inverted?:boolean;onValidity?:(valid:boolean)=>void;onAspect?:(ratio:number)=>void;compact?:boolean}){
 const [geometry,setGeometry]=useState<ReturnType<typeof engravingGeometry>|null>(null);const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;setGeometry(null);setError("");onValidity?.(false);
  const entry=findEngravingFont(fontId);if(!entry?.file||!name.trim())return;
  if(!fonts.has(fontId))fonts.set(fontId,fetch(`/fonts/engraving/${entry.file}`).then(async r=>{if(!r.ok)throw Error("Não foi possível carregar a fonte.");return parseEngravingFont(new Uint8Array(await r.arrayBuffer()));}));
  fonts.get(fontId)!.then(f=>{const g=engravingGeometry(f,name.normalize("NFC"));if(active){setGeometry(g);onValidity?.(true);onAspect?.(g.height/g.width);}}).catch(e=>{if(active){setError(e.message||"Falha ao preparar a fonte.");onValidity?.(false);}});
  return()=>{active=false;};
 },[name,fontId,onValidity,onAspect]);
 const padding=geometry?geometry.height*.12:0;
 return <div className={`rl-engraving-preview ${inverted?"inverted":""} ${compact?"compact":""}`} aria-label={`Prévia de ${name} em ${findEngravingFont(fontId)?.name}`}>
  {geometry?<svg role="img" viewBox={`${geometry.minX-padding} ${geometry.minY-padding} ${geometry.width+2*padding} ${geometry.height+2*padding}`}><path d={geometry.path} fill="currentColor"/></svg>:fontId==="arial"?<span style={{fontFamily:engravingFamily(fontId)}}>{name}</span>:<span className="preview-loading" role={error?"alert":undefined}>{error||(!name.trim()?"Seu nome aqui":"Preparando prévia…")}</span>}
 </div>;
}