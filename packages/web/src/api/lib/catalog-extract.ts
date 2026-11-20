import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createGateway } from "ai";
import { generateObject } from "ai";
import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";
import { z } from "zod";
import { s3 } from "./s3";

const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

const MODEL = "google/gemini-3-flash";
/** Páginas de PDF enviadas por vez para a IA (catálogos grandes são fatiados). */
const PAGES_PER_CHUNK = 8;
/** Quantos pedaços analisamos ao mesmo tempo. */
const CONCURRENCY = 3;

export const extractedProductSchema = z.object({
  code: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  unitPriceBrl: z.number().nullable(),
  boxQty: z.number().int().nullable(),
  boxPriceBrl: z.number().nullable(),
  features: z.string().nullable(),
  specs: z.string().nullable(),
  dimensions: z.string().nullable(),
  colors: z.string().nullable(),
  material: z.string().nullable(),
  brand: z.string().nullable(),
  sourcePage: z.number().int().nullable(),
  personalizable: z.enum(["excelente", "bom", "pouco", "nao"]),
  laserNote: z.string().nullable(),
});

export type ExtractedProduct = z.infer<typeof extractedProductSchema>;

const responseSchema = z.object({ products: z.array(extractedProductSchema) });

const SYSTEM = `Você extrai produtos de catálogos de fornecedores para a Rafa Laser,
uma empresa brasileira de presentes personalizados e gravação a laser.

REGRAS ABSOLUTAS:
- Extraia TODOS os produtos que aparecem no trecho recebido, sem pular nenhum.
- NUNCA invente dados. Quando a informação não estiver no catálogo, use null.
- Preços sempre em reais (número), sem símbolo. Use ponto decimal.
- sourcePage é o número da página real do catálogo indicado no texto do pedido.
- personalizable classifica o potencial de gravação a laser:
  "excelente" (aço inox, alumínio, metal, madeira, MDF, couro, acrílico, vidro, ardósia),
  "bom" (produto de brinde/presente que costuma aceitar gravação),
  "pouco" (produto pouco interessante para personalizar),
  "nao" (produto que não aceita gravação, ex.: alimentos, tecido fino descartável).
- laserNote: quando houver dúvida sobre o material, escreva
  "Verificar compatibilidade com gravação a laser." Caso contrário, null.`;

async function getObjectBytes(key: string): Promise<Uint8Array> {
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  const buf = await res.Body!.transformToByteArray();
  return buf;
}

async function runChunk(
  parts: Array<{ type: "text"; text: string } | { type: "file"; data: Uint8Array; mediaType: string }>,
): Promise<ExtractedProduct[]> {
  const { object } = await generateObject({
    model: gateway(MODEL),
    schema: responseSchema,
    system: SYSTEM,
    messages: [{ role: "user", content: parts as never }],
  });
  return object.products;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Divide o PDF em blocos de páginas e analisa todos (nunca só a primeira). */
async function extractFromPdf(
  bytes: Uint8Array,
  onProgress?: (done: number, total: number) => void,
): Promise<{ products: ExtractedProduct[]; pages: number }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPageCount();
  const chunks: { start: number; end: number }[] = [];
  for (let i = 0; i < pages; i += PAGES_PER_CHUNK) {
    chunks.push({ start: i, end: Math.min(i + PAGES_PER_CHUNK, pages) });
  }

  let done = 0;
  const lists = await mapLimit(chunks, CONCURRENCY, async (chunk) => {
    const sub = await PDFDocument.create();
    const copied = await sub.copyPages(
      doc,
      Array.from({ length: chunk.end - chunk.start }, (_, i) => chunk.start + i),
    );
    copied.forEach((p) => sub.addPage(p));
    const data = await sub.save();
    const label = `Este trecho corresponde às páginas ${chunk.start + 1} a ${chunk.end} do catálogo (total de ${pages} páginas). Use esses números em sourcePage.`;
    let products: ExtractedProduct[] = [];
    try {
      products = await runChunk([
        { type: "text", text: label },
        { type: "file", data, mediaType: "application/pdf" },
      ]);
    } catch {
      products = [];
    }
    done += 1;
    onProgress?.(done, chunks.length);
    return products;
  });

  return { products: lists.flat(), pages };
}

async function extractFromImage(bytes: Uint8Array, mimeType: string): Promise<ExtractedProduct[]> {
  return runChunk([
    { type: "text", text: "Imagem de uma página de catálogo. Página 1." },
    { type: "file", data: bytes, mediaType: mimeType },
  ]);
}

/** Converte XLSX/CSV em texto e envia em blocos de linhas para a IA. */
async function extractFromSheet(
  bytes: Uint8Array,
  onProgress?: (done: number, total: number) => void,
): Promise<ExtractedProduct[]> {
  const wb = XLSX.read(bytes, { type: "array" });
  const rows: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
    rows.push(`### Planilha: ${sheetName}\n${csv}`);
  }
  const full = rows.join("\n\n");
  const lines = full.split("\n");
  const CHUNK_LINES = 200;
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += CHUNK_LINES) {
    chunks.push(lines.slice(i, i + CHUNK_LINES).join("\n"));
  }
  let done = 0;
  const lists = await mapLimit(chunks, CONCURRENCY, async (chunk) => {
    let products: ExtractedProduct[] = [];
    try {
      products = await runChunk([
        {
          type: "text",
          text: `Planilha de catálogo (trecho). Cada linha é um produto.\n\n${chunk}`,
        },
      ]);
    } catch {
      products = [];
    }
    done += 1;
    onProgress?.(done, chunks.length);
    return products;
  });
  return lists.flat();
}

/** Lê o arquivo do storage e devolve todos os produtos encontrados. */
export async function extractCatalog(
  fileKey: string,
  mimeType: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ products: ExtractedProduct[]; pages: number }> {
  const bytes = await getObjectBytes(fileKey);
  if (mimeType.includes("pdf")) return extractFromPdf(bytes, onProgress);
  if (mimeType.startsWith("image/")) {
    return { products: await extractFromImage(bytes, mimeType), pages: 1 };
  }
  return { products: await extractFromSheet(bytes, onProgress), pages: 0 };
}
