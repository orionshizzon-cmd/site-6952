import { useId } from "react";
import { ProductionPreview } from "./production-preview";
import { referenceProducts, referenceOrientations, type ReferenceProduct, type ReferenceOrientation } from "../../shared/product-reference";
import "./product-reference.css";

export function ProductReferencePreview({name,fontId,product,orientation}:{name:string;fontId:string;product:string;orientation:string}) {
 const id=useId().replace(/:/g,"");
 const bottle=product==="Garrafa térmica";
 return <figure className={`rl-product-reference ${bottle?"bottle":"cup"}`} aria-label={`Referência: ${product}, nome na ${orientation.toLowerCase()}`}>
  <div className="rl-product-model">
   <svg viewBox="0 0 300 400" role="img" aria-label={`Modelo genérico de ${product.toLowerCase()}`}>
    <defs><linearGradient id={id}><stop stopColor="#a9afb4"/><stop offset=".25" stopColor="#f4f5f5"/><stop offset=".65" stopColor="#d3d7da"/><stop offset="1" stopColor="#969fa6"/></linearGradient></defs>
    <ellipse cx="150" cy="377" rx="83" ry="10" fill="#000" opacity=".08"/>
    {bottle?<><path d="M113 48h74v37c0 13 31 19 31 53v208q0 22-22 22h-92q-22 0-22-22V138c0-34 31-40 31-53Z" fill={`url(#${id})`} stroke="#899299" strokeWidth="2"/><rect x="108" y="26" width="84" height="42" rx="10" fill="#33383c"/><path d="M112 60h76" stroke="#687077" strokeWidth="3"/></>:<><path d="M59 91h182l-24 254q-2 23-23 23h-88q-21 0-23-23Z" fill={`url(#${id})`} stroke="#899299" strokeWidth="2"/><rect x="52" y="68" width="196" height="30" rx="12" fill="#343a3f"/><path d="M91 66h118" stroke="#899299" strokeWidth="8" strokeLinecap="round"/></>}
   </svg>
   <div className={`rl-product-name ${orientation==="Vertical"?"vertical":"horizontal"}`}><ProductionPreview name={name} fontId={fontId}/></div>
  </div>
  <figcaption>{product} · {orientation}<small>Modelo genérico ilustrativo. Posição e tamanho finais serão conferidos pela equipe.</small></figcaption>
  {orientation==="Horizontal"&&<p className="rl-note"><strong>Atenção aos nomes compostos:</strong> na gravação horizontal, os nomes ficarão um abaixo do outro, pois a largura da área de gravação é, em média, de 40 mm. A prévia acima não simula essa divisão em linhas; a equipe fará esse ajuste na produção.</p>}
 </figure>;
}

export function ProductReferenceChooser({name,fontId,product,orientation,onProduct,onOrientation}:{name:string;fontId:string;product:ReferenceProduct;orientation:ReferenceOrientation;onProduct:(value:ReferenceProduct)=>void;onOrientation:(value:ReferenceOrientation)=>void}) {
 return <section className="rl-reference-chooser"><h3>Veja uma referência na peça</h3><p>Escolha o objeto e o sentido do nome. Essa informação acompanha seu pedido.</p>
  <fieldset><legend>Objeto de referência</legend><div>{referenceProducts.map(value=><label key={value}><input type="radio" name="reference-product" value={value} checked={product===value} onChange={()=>onProduct(value)}/>{value}</label>)}</div></fieldset>
  <fieldset><legend>Sentido da gravação</legend><div>{referenceOrientations.map(value=><label key={value}><input type="radio" name="reference-orientation" value={value} checked={orientation===value} onChange={()=>onOrientation(value)}/>{value}</label>)}</div></fieldset>
  <ProductReferencePreview name={name} fontId={fontId} product={product} orientation={orientation}/>
  <p className="rl-note">Vertical gira o nome inteiro em 90°. A prévia é uma referência visual, não uma garantia de tamanho ou acabamento. O SVG de produção continua separado e será posicionado pela equipe.</p>
 </section>;
}