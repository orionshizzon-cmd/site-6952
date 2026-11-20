import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Download, Share2, ZoomIn, X } from "lucide-react";
import type { Personalization } from "../queries/personalizations";
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");a.href = url;a.download = name;a.click();setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function PersonalizationCodes({ record }: { record: Personalization }) {
  const svg = useRef<SVGSVGElement>(null);const [qr,setQr]=useState("");const [zoom,setZoom]=useState(false);const [barcodeZoom,setBarcodeZoom]=useState("");const [error,setError]=useState("");
  const url = `${window.location.origin}/personalizar/ficha/${record.code}`;
  useEffect(() => {
    let active=true;
    try {if (svg.current) JsBarcode(svg.current, record.code, {format:"CODE128", width:2, height:90, margin:24, fontSize:18, background:"#fff", lineColor:"#000"});} catch {setError("Não foi possível gerar o código de barras.");}
    QRCode.toDataURL(url,{width:640,margin:4,errorCorrectionLevel:"M"}).then(q=>{if(active)setQr(q);}).catch(()=>setError("Não foi possível gerar o QR Code."));
    return()=>{active=false;};
  },[record.code,url]);
  async function share() {
    try {if(navigator.share) await navigator.share({title:"Minha personalização Rafa Laser",text:`${record.name} • ${record.fontName}`,url});else {await navigator.clipboard.writeText(url);setError("Link copiado para compartilhar.");}} catch (e) {if((e as Error).name!=="AbortError")setError("Use o link da ficha para compartilhar.");}
  }
  return <section className="rl-codes">
    <div className="rl-barcode"><p>CÓDIGO PARA O LEITOR DA LOJA</p><div className="rl-barcode-scroll"><svg ref={svg} role="img" aria-label={`Código de barras ${record.code}`} /></div><span>Não recorte as margens brancas. Amplie a tela se necessário.</span><button className="rl-secondary" onClick={()=>{if(svg.current)setBarcodeZoom("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(svg.current)));}}><ZoomIn size={16}/>Ampliar código de barras</button><button className="rl-secondary" onClick={()=>{if(svg.current)downloadBlob(new Blob([new XMLSerializer().serializeToString(svg.current)],{type:"image/svg+xml"}),`${record.code}-barcode.svg`);}}><Download size={16}/>Salvar código de barras</button></div>
    <div className="rl-qr"><p>FICHA DA PERSONALIZAÇÃO</p>{qr ? <img src={qr} alt={`QR da ficha ${record.code}`} width={240} height={240}/> : <p>Gerando QR Code…</p>}<div className="rl-actions"><button onClick={()=>setZoom(true)} className="rl-secondary"><ZoomIn size={16}/>Ampliar</button><button className="rl-secondary" disabled={!qr} onClick={()=>{const a=document.createElement("a");a.href=qr;a.download=`${record.code}-qr.png`;a.click();}}><Download size={16}/>Salvar QR</button><button className="rl-secondary" onClick={share}><Share2 size={16}/>Compartilhar</button></div></div>
    <p className="rl-code-label">{record.code}</p><a className="rl-ficha-link" href={url}>Abrir ficha da personalização</a>{error&&<p role="status">{error}</p>}
    {zoom&&<div className="rl-qr-modal" role="dialog" aria-modal="true" aria-label="QR Code ampliado"><button aria-label="Fechar" onClick={()=>setZoom(false)}><X/></button><img src={qr} alt="QR Code ampliado"/><p>{record.code}</p></div>}
    {barcodeZoom&&<div className="rl-qr-modal" role="dialog" aria-modal="true" aria-label="Código de barras ampliado"><button aria-label="Fechar" onClick={()=>setBarcodeZoom("")}><X/></button><div style={{maxWidth:"100%",overflowX:"auto",background:"white"}}><img src={barcodeZoom} alt="Code 128 ampliado" style={{width:640,maxWidth:"none"}}/></div><p>Gire o celular para ver o código completo.</p></div>}
  </section>;
}