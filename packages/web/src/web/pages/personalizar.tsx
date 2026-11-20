import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Contrast, ScanLine } from "lucide-react";
import { engravingFamily, engravingFonts } from "../../shared/engraving-fonts";
import { EngravingPreview } from "../components/engraving-preview";
import { PersonalizationCodes } from "../components/personalization-codes";
import { useCreatePersonalization, usePersonalization, type Personalization } from "../queries/personalizations";
import "./personalizar.css";

function usePersonalizationManifest() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "manifest"; link.href = "/personalizar.webmanifest";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
}
export default function PersonalizarPage() {
  usePersonalizationManifest();
  const [step,setStep]=useState(1);const [name,setName]=useState("");const [fontId,setFont]=useState("montserrat");
  const [inverted,setInverted]=useState(false);const [error,setError]=useState("");const [record,setRecord]=useState<Personalization|null>(null);
  const create=useCreatePersonalization();const key=useRef<{payload:string;key:string}|null>(null);
  const valid=/^[\p{L}\p{M} ]+$/u.test(name)&&!!name.trim();
  function next(){if(!valid){setError("Digite um nome usando letras, acentos e espaços.");return;}setError("");setStep(s=>s+1);}
  async function confirm(){
    setError("");const payload=JSON.stringify({name,fontId});
    if(key.current?.payload!==payload){
      try {const saved=JSON.parse(sessionStorage.getItem("rl-engraving-submit")||"null");key.current=saved?.payload===payload?saved:{payload,key:crypto.randomUUID()};sessionStorage.setItem("rl-engraving-submit",JSON.stringify(key.current));}catch{key.current={payload,key:crypto.randomUUID()};}
    }
    try{const r=await create.mutateAsync({name,fontId,requestKey:key.current!.key});setRecord(r);setStep(4);}catch(e){setError(e instanceof Error?e.message:"Não foi possível confirmar. Tente novamente.");}
  }
  return <main className="rl-personalize">
    <div className="rl-kicker"><ScanLine size={18}/> PERSONALIZAÇÃO INTELIGENTE</div>
    <div className="rl-page-heading"><h1>Seu nome.<br/><em>Sua marca.</em></h1><p>Personalizando momentos,<br/>criando memórias.</p></div>
    <ol className="rl-steps">{["Digite seu nome","Escolha a fonte","Confira","Gere seu código"].map((label,i)=><li key={label} className={step>=i+1?"active":""}><span>{step>i+1?<Check size={14}/>:i+1}</span><small>{label}</small></li>)}</ol>
    {step===4&&record?<Result record={record} onNew={()=>{setStep(1);setName("");setRecord(null);key.current=null;sessionStorage.removeItem("rl-engraving-submit");}}/>:<div className="rl-workspace">
      <section className="rl-editor">
        <p className="rl-label">ETAPA {step} DE 4</p>
        {step===1?<><h2>Qual nome você deseja gravar?</h2><p>Digite exatamente como deseja ver na sua peça, incluindo maiúsculas e acentos.</p><label htmlFor="engraving-name">Nome para gravação</label><input id="engraving-name" autoComplete="off" placeholder="Ex.: João Gabriel" maxLength={60} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")next();}}/><div className="rl-character-count">{[...name].length}/60 caracteres</div></>:null}
        {step===2?<><h2>Escolha seu estilo de letra.</h2><p>Cada detalhe muda a personalidade da sua gravação.</p><div className="rl-font-grid">{engravingFonts.map(f=><button type="button" aria-pressed={fontId===f.id} className={fontId===f.id?"selected":""} key={f.id} onClick={()=>setFont(f.id)}><span style={{fontFamily:engravingFamily(f.id)}}>{name}</span><small>{f.name} — {f.style}</small>{fontId===f.id&&<Check size={16}/>}</button>)}</div></>:null}
        {step===3?<><h2>Confira antes de gravar.</h2><p>O nome será preservado como você digitou. Confira a escrita com atenção.</p><dl className="rl-review"><dt>Nome</dt><dd>{name}</dd><dt>Fonte</dt><dd>{engravingFonts.find(f=>f.id===fontId)?.name}</dd></dl><div className="rl-note">Seu código identifica a personalização. A equipe prepara e importa o arquivo no LightBurn; nenhuma máquina é acionada automaticamente.</div></>:null}
        {error&&<p className="rl-error" role="alert">{error}</p>}
        <div className="rl-actions">{step>1&&<button className="rl-secondary" disabled={create.isPending} onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/>Voltar</button>}<button className="rl-primary" disabled={create.isPending} onClick={step===3?confirm:next}>{create.isPending?"Salvando…":step===3?"Confirmar e gerar código":"Continuar"}<ArrowRight size={17}/></button></div>
      </section>
      <aside className="rl-preview-panel"><div className="rl-preview-head"><span>PRÉVIA DA GRAVAÇÃO</span><button aria-label="Inverter contraste" onClick={()=>setInverted(v=>!v)}><Contrast size={17}/>Inverter</button></div><EngravingPreview name={name} fontId={fontId} inverted={inverted}/><p>{engravingFonts.find(f=>f.id===fontId)?.name} · preto e branco</p><small>Prévia do desenho, não da textura do material. O acabamento depende da peça e dos ajustes do laser.</small>{fontId==="arial"&&<p className="rl-note">Arial usa a fonte do dispositivo. Exportação vetorial indisponível até fornecer um arquivo licenciado.</p>}</aside>
    </div>}
    <div className="rl-page-footer"><span>RAFA LASER · IMPERATRIZ–MA</span><Link href="/">Voltar ao site</Link></div>
  </main>;
}
function Result({record,onNew}:{record:Personalization;onNew?:()=>void}){
 return <section className="rl-result"><div className="rl-success-icon"><Check/></div><p className="rl-label">PERSONALIZAÇÃO PRONTA!</p><h2>{record.name}</h2><p>{record.fontName} · {record.status}</p><p>Apresente este código à nossa equipe para preparar sua gravação.</p><PersonalizationCodes record={record}/>{onNew?<button className="rl-primary" onClick={onNew}>Fazer outra personalização<ArrowRight size={16}/></button>:<Link className="rl-primary" href="/personalizar">Fazer outra personalização</Link>}</section>;
}
export function PersonalizationFicha({code}:{code:string}){
 usePersonalizationManifest();
 const query=usePersonalization(code);
 return <main className="rl-personalize"><p className="rl-kicker">RAFA LASER · FICHA DA PERSONALIZAÇÃO</p>{query.isLoading?<p>Carregando sua ficha…</p>:query.isError?<div className="rl-error" role="alert">{query.error.message}<p><Link href="/personalizar">Criar personalização</Link></p></div>:query.data?<><Result record={query.data}/><EngravingPreview name={query.data.name} fontId={query.data.fontId}/></>:null}</main>;
}