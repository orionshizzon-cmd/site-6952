import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../database";
import { categories, products, UNCATEGORIZED } from "../database/schema";
import {
  AttachmentError,
  BodyTooLargeError,
  isChatGptFileUrl,
  maxAttachments,
  readBoundedBody,
  storeChatGptPhotos,
} from "../lib/chatgpt-product-images";

const slugSchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const line = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^\r\n]+$/);
const attachments = z
  .array(
    z.object({
      download_link: z.string().max(8192).refine(isChatGptFileUrl),
      id: z.string().optional(),
      name: z.string().optional(),
      mime_type: z.string().optional(),
    }),
  )
  .min(1)
  .max(maxAttachments);
const fields = z.strictObject({
  name: line,
  category: line.optional(),
  shortDescription: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(6000),
  price: z.number().int().nonnegative().nullable().optional(),
  capacity: line.optional(),
  material: line.optional(),
  features: z
    .array(line.refine((value) => !/^(capacidade|material)\s*:/i.test(value)))
    .max(20)
    .optional(),
  colors: z
    .array(z.strictObject({ name: line, hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) }))
    .max(30)
    .optional(),
  openaiFileIdRefs: attachments,
});

const createDraftInput = fields.extend({ slug: slugSchema });
async function categoryExists(category: string | undefined): Promise<boolean> {
  if (!category || category === UNCATEGORIZED) return true;
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, category));
  return Boolean(row);
}

async function photos(files: z.infer<typeof attachments>) {
  const [image, ...gallery] = await storeChatGptPhotos(files);
  return { image, media: gallery.map((key) => ({ type: "image" as const, key })) };
}

const digest = (value: string) => createHash("sha256").update(value).digest();
export const chatgptProducts = new Hono();

chatgptProducts.onError((error, c) => {
  if (error instanceof BodyTooLargeError)
    return c.json({ error: "A solicitação excede 64 KiB." }, 413);
  if (error instanceof AttachmentError) return c.json({ error: error.message }, 422);
  console.error("Falha interna no cadastro ChatGPT", error.name);
  return c.json({ error: "Não foi possível salvar o rascunho. Tente novamente." }, 500);
});

async function draftJson(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const bytes = await readBoundedBody(request.body, 64 * 1024);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return null;
  }
}

const draftResult = { id: products.id, slug: products.slug, active: products.active };

chatgptProducts.post("/", async (c) => {
  c.header("Cache-Control", "no-store");
  const secret = process.env.CHATGPT_PRODUCTS_TOKEN;
  const adminSecret = process.env.ADMIN_SESSION_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret) || !adminSecret) {
    return c.json({ error: "Integração indisponível." }, 404);
  }
  const authorization = c.req.header("Authorization") ?? "";
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) {
    return c.json({ error: "Credencial inválida." }, 401);
  }
  if (c.req.header("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return c.json({ error: "Envie application/json." }, 415);
  }
  const parsed = createDraftInput.safeParse(await draftJson(c.req.raw));
  if (!parsed.success) return c.json({ error: "Dados do produto inválidos." }, 400);
  const { slug, capacity, material, features, openaiFileIdRefs, ...changes } = parsed.data;
  const specs = [
    ...(capacity ? [`Capacidade: ${capacity}`] : []),
    ...(material ? [`Material: ${material}`] : []),
    ...(features ?? []),
  ].join("\n");
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug));
  if (existing)
    return c.json({ error: "O slug já existe. Escolha outro slug para um novo produto." }, 409);
  if (!(await categoryExists(changes.category))) {
    return c.json({ error: "Use uma categoria existente ou omita a categoria." }, 422);
  }

  const [created] = await db
    .insert(products)
    .values({
      ...changes,
      category: changes.category ?? UNCATEGORIZED,
      colors: changes.colors ?? [],
      specs: specs || null,
      ...(await photos(openaiFileIdRefs)),
      slug,
      active: false,
    })
    .onConflictDoNothing({ target: products.slug })
    .returning(draftResult);

  if (!created)
    return c.json({ error: "O slug já existe. Escolha outro slug para um novo produto." }, 409);
  return c.json(created, 201);
});
