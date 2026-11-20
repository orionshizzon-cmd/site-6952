import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { zipSync, strToU8 } from "fflate";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import { personalizations as table, personalizationNumbers as numbers, personalizationPresets as presets } from "../database/schema";
import { engravingFonts, engravingStatuses, orderLabel } from "../../shared/engraving-fonts";
import { engravingSvg } from "../lib/engraving-svg";
import { referenceProducts, referenceOrientations } from "../../shared/product-reference";

const codeInput = z.object({code:z.string().trim().toUpperCase().regex(/^RL[0-9A-F]{16}$/)});
const dimensions = z.object({maxWidthMm:z.number().min(5).max(500),marginMm:z.number().min(0).max(20).default(0),scalePct:z.number().int().min(10).max(100).default(100),profile:z.string().min(1).max(60).default("Personalizado")}).refine(x=>x.maxWidthMm>2*x.marginMm,{message:"A largura precisa ser maior que duas margens de segurança."});
async function find(code:string) {const [row]=await db.select().from(table).where(eq(table.code,code));if(!row)throw new ORPCError("NOT_FOUND",{message:"Pedido não encontrado."});return row;}
function publicRecord(row:typeof table.$inferSelect){const {code,orderNumber,name,fontId,fontName,status,createdAt,referenceProduct,referenceOrientation}=row;return {code,orderNumber,orderLabel:orderLabel(orderNumber,code),name,fontId,fontName,status,createdAt,referenceProduct,referenceOrientation};}
const safeName=(s:string)=>s.normalize("NFC").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").slice(0,65);
function filename(row:typeof table.$inferSelect){return `${orderLabel(row.orderNumber,row.code)}_${safeName(row.name)}_${safeName(row.fontName)}.svg`;}

export const personalizationProduction = {
 create:base.input(z.object({name:z.string().min(1).max(60).refine(s=>/^[\p{L}\p{M} ]+$/u.test(s)&&!!s.trim(),"Use letras, acentos e espaços (até 60 caracteres)."),fontId:z.string().refine(id=>engravingFonts.some(f=>f.id===id),"Fonte inválida ou indisponível."),requestKey:z.string().uuid(),referenceProduct:z.enum(referenceProducts).default("Garrafa térmica"),referenceOrientation:z.enum(referenceOrientations).default("Horizontal")})).handler(async({input})=>{
  const name=input.name.normalize("NFC");
  const existing=(await db.select().from(table).where(eq(table.requestKey,input.requestKey)))[0];
  if(existing){if(existing.name!==name||existing.fontId!==input.fontId||existing.referenceProduct!==input.referenceProduct||existing.referenceOrientation!==input.referenceOrientation)throw new ORPCError("CONFLICT",{message:"Esta confirmação já foi usada. Comece outro pedido."});return publicRecord(existing);}
  await engravingSvg(name,input.fontId,80); // Refuse incomplete/unrenderable orders before persisting.
  const row=await db.transaction(async tx=>{
   const [saved]=await tx.insert(table).values({id:randomUUID(),code:`RL${randomBytes(8).toString("hex").toUpperCase()}`,requestKey:input.requestKey,name,referenceProduct:input.referenceProduct,referenceOrientation:input.referenceOrientation,fontId:input.fontId,fontName:engravingFonts.find(f=>f.id===input.fontId)!.name,createdAt:new Date().toISOString()}).onConflictDoNothing({target:table.requestKey}).returning();
   if(!saved)return (await tx.select().from(table).where(eq(table.requestKey,input.requestKey)))[0];
   const [n]=await tx.insert(numbers).values({code:saved.code}).returning();
   return (await tx.update(table).set({orderNumber:n.id}).where(eq(table.id,saved.id)).returning())[0];
  });
  if(!row||row.name!==name||row.fontId!==input.fontId||row.referenceProduct!==input.referenceProduct||row.referenceOrientation!==input.referenceOrientation)throw new ORPCError("CONFLICT",{message:"Confirmação já utilizada."});
  return publicRecord(row);
 }),
 get:base.input(codeInput).handler(async({input})=>publicRecord(await find(input.code))),
 list:adminBase.handler(()=>db.select().from(table).orderBy(desc(table.createdAt),desc(table.orderNumber))),
 lookup:adminBase.input(codeInput).handler(({input})=>find(input.code)),
 update:adminBase.input(codeInput.extend({status:z.enum(engravingStatuses)}).and(dimensions)).handler(async({input})=>{await find(input.code);return (await db.update(table).set({status:input.status,maxWidthMm:input.maxWidthMm,marginMm:input.marginMm,scalePct:input.scalePct,profile:input.profile,updatedAt:new Date().toISOString()}).where(eq(table.code,input.code)).returning())[0];}),
 exportSvg:adminBase.input(codeInput.and(dimensions)).handler(async({input})=>{const row=await find(input.code);const result=await engravingSvg(row.name,row.fontId,input.maxWidthMm,input.marginMm,input.scalePct);return {...result,filename:filename(row)};}),
 delete:adminBase.input(codeInput.extend({confirmed:z.literal(true)})).handler(async({input})=>{await find(input.code);await db.delete(table).where(eq(table.code,input.code));return {ok:true};}),
 exportZip:adminBase.input(z.object({codes:z.array(z.string().regex(/^RL[0-9A-F]{16}$/)).min(1).max(100)})).handler(async({input})=>{
  const codes=[...new Set(input.codes)];const rows=await db.select().from(table).where(inArray(table.code,codes));
  if(rows.length!==codes.length)throw new ORPCError("NOT_FOUND",{message:"Um pedido selecionado não existe mais. Atualize a fila."});
  const files:Record<string,Uint8Array>={};
  for(const row of rows){try{files[filename(row)]=strToU8((await engravingSvg(row.name,row.fontId,row.maxWidthMm,row.marginMm,row.scalePct)).svg);}catch(e){throw new ORPCError("BAD_REQUEST",{message:`${orderLabel(row.orderNumber,row.code)}: ${(e as Error).message} Nenhum ZIP incompleto foi gerado.`});}}
  return {base64:Buffer.from(zipSync(files,{level:6})).toString("base64"),filename:`Rafa-Laser_${rows.length}-personalizacoes.zip`,count:rows.length};
 }),
 presets:adminBase.handler(()=>db.select().from(presets)),
 savePreset:adminBase.input(z.object({id:z.string().min(1).max(40),name:z.string().min(1).max(60)}).and(dimensions)).handler(async({input})=>{const value={id:input.id,name:input.name,maxWidthMm:input.maxWidthMm,marginMm:input.marginMm,scalePct:input.scalePct};return (await db.insert(presets).values(value).onConflictDoUpdate({target:presets.id,set:value}).returning())[0];}),
};