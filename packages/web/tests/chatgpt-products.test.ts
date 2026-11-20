import { afterAll, afterEach, beforeAll, expect, spyOn, test } from "bun:test";
import { createClient } from "@libsql/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import sharp from "sharp";

const dir = mkdtempSync(join(tmpdir(), "rafa-chatgpt-"));
const databaseUrl = `file:${join(dir, "test.db")}`;
const sql = createClient({ url: databaseUrl });
const token = "a".repeat(64);
const endpoint = "/api/chatgpt/products";
const file = { download_link: "https://files.oaiusercontent.com/file-test?signature=fake" };
let app: typeof import("../src/api").default;
let verifyAdminToken: typeof import("../src/api/lib/admin-auth").verifyToken;
let s3: typeof import("../src/api/lib/s3").s3;
let png: Buffer;

function setTestEnv(name: string, value: string | undefined) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  return () => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  };
}

const restoreEnv: (() => void)[] = [];
beforeAll(async () => {
  restoreEnv.push(
    setTestEnv("DATABASE_URL", databaseUrl),
    setTestEnv("CHATGPT_PRODUCTS_TOKEN", token),
    setTestEnv("S3_ACCESS_KEY_ID", "fake-access-key"),
    setTestEnv("S3_SECRET_ACCESS_KEY", "fake-secret-key"),
    setTestEnv("S3_BUCKET", "fake-test-bucket"),
    setTestEnv("ADMIN_SESSION_SECRET", undefined),
    setTestEnv("BETTER_AUTH_SECRET", undefined),
  );
  ({ default: app } = await import("../src/api"));
  ({ s3 } = await import("../src/api/lib/s3"));
  ({ verifyToken: verifyAdminToken } = await import("../src/api/lib/admin-auth"));
  await sql.executeMultiple(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL, category TEXT NOT NULL, short_description TEXT NOT NULL,
      description TEXT NOT NULL, specs TEXT, price INTEGER, image TEXT NOT NULL,
      media TEXT NOT NULL DEFAULT '[]', colors TEXT NOT NULL, stock INTEGER,
      customizable INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    INSERT INTO categories VALUES (1, 'Copos');
    INSERT INTO products (slug, name, category, short_description, description, image, colors, active, created_at)
    VALUES ('publico', 'Público', 'Copos', 'Resumo', 'Descrição', '/images/logo.png', '[]', 1, 1),
           ('rascunho', 'Rascunho', 'Copos', 'Resumo', 'Descrição', '/images/logo.png', '[]', 0, 1);
  `);
  png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#123456" },
  })
    .png()
    .toBuffer();
});

afterEach(() => {
  // Os testes que substituem fetch e S3 restauram ambos antes da próxima chamada.
  for (const restore of restoreMocks.splice(0)) restore();
});

afterAll(() => {
  for (const restore of restoreEnv.reverse()) restore();
  sql.close();
  rmSync(dir, { recursive: true, force: true });
});

const restoreMocks: (() => void)[] = [];
function mockStorage(body: BodyInit) {
  const download = spyOn(globalThis, "fetch").mockImplementation(async () => new Response(body));
  const upload = spyOn(s3, "send").mockResolvedValue({ $metadata: {} });
  restoreMocks.push(
    () => download.mockRestore(),
    () => upload.mockRestore(),
  );
  return { download, upload };
}

function post(path: string, body: unknown, credential = token) {
  return app.request(path, {
    method: "POST",
    headers: { authorization: `Bearer ${credential}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rpc(method: string, input?: unknown, credential?: string) {
  return post(`/api/rpc/${method}`, { json: input }, credential);
}

const draft = {
  slug: "copo-teste",
  category: "Copos",
  name: "Copo inox",
  shortDescription: "Copo para gravação",
  description: "Copo de parede dupla",
  price: 8990,
  capacity: "500 ml",
  material: "Aço inox",
  features: ["Isolamento: parede dupla"],
  colors: [{ name: "Preto", hex: "#111111" }],
  openaiFileIdRefs: [file, file],
};

test("desativa a Action sem segredo e rejeita credencial incorreta", async () => {
  const restore = setTestEnv("CHATGPT_PRODUCTS_TOKEN", undefined);
  try {
    expect((await post(endpoint, draft)).status).toBe(404);
  } finally {
    restore();
  }
  expect((await post(endpoint, draft, "invalid")).status).toBe(401);
  expect((await rpc("admin/me", undefined, token)).status).toBe(401);
});

test("rejeita assinatura administrativa quando falta um segredo configurado", () => {
  const payload = Buffer.from(`shizzonkay.${Date.now() + 60_000}`).toString("base64url");
  const signature = createHmac("sha256", "rafa-laser-dev-secret-change-me")
    .update(payload)
    .digest("base64url");
  expect(verifyAdminToken(`${payload}.${signature}`)).toBe(false);
});

test("limita o JSON e rejeita publicação, preço fracionário e URLs externas", async () => {
  expect((await post(endpoint, { ...draft, description: "x".repeat(66_000) })).status).toBe(413);
  expect((await post(endpoint, { ...draft, active: true })).status).toBe(400);
  expect((await post(endpoint, { ...draft, price: 89.9 })).status).toBe(400);
  for (const download_link of [
    "http://files.oaiusercontent.com/file-test",
    "https://files.oaiusercontent.com.evil.example/file-test",
    "https://files.oaiusercontent.com@127.0.0.1/file-test",
    "https://files.oaiusercontent.com:8443/file-test",
    "https://169.254.169.254/file-test",
  ]) {
    expect((await post(endpoint, { ...draft, openaiFileIdRefs: [{ download_link }] })).status).toBe(
      400,
    );
  }
});

test("rejeita categoria que não existe sem cadastrar produto", async () => {
  expect((await post(endpoint, { ...draft, category: "Nova categoria" })).status).toBe(422);
});

test("rejeita arquivo inválido antes de gravar produto ou imagem", async () => {
  const { upload } = mockStorage("<svg />");
  expect((await post(endpoint, { ...draft, slug: "invalido" })).status).toBe(422);
  expect(upload).not.toHaveBeenCalled();
  expect((await sql.execute("SELECT id FROM products WHERE slug = 'invalido'")).rows).toHaveLength(
    0,
  );
});

test("cria rascunho com capa, galeria, preço e ficha e evita duplicidade", async () => {
  const { download, upload } = mockStorage(png);
  const response = await post(endpoint, draft);
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({ slug: draft.slug, active: false });
  expect(download).toHaveBeenCalledWith(
    file.download_link,
    expect.objectContaining({ redirect: "error" }),
  );
  expect(upload).toHaveBeenCalledTimes(2);
  const [row] = (await sql.execute("SELECT * FROM products WHERE slug = 'copo-teste'")).rows;
  expect(row).toMatchObject({
    active: 0,
    price: 8990,
    specs: "Capacidade: 500 ml\nMaterial: Aço inox\nIsolamento: parede dupla",
  });
  expect(row.image).toMatch(/^catalog\/chatgpt\/[0-9a-f]{64}\.webp$/);
  expect(JSON.parse(String(row.media))).toEqual([{ type: "image", key: row.image }]);
  expect(JSON.parse(String(row.colors))).toEqual(draft.colors);
  expect((await post(endpoint, draft)).status).toBe(409);
  expect(upload).toHaveBeenCalledTimes(2);
});

test("atualiza apenas os campos enviados e mantém o produto inativo", async () => {
  await sql.execute(
    "UPDATE products SET specs = 'Capacidade: 500 ml\nMaterial: Aço inox\nIsolamento: duplo' WHERE slug = 'rascunho'",
  );
  const response = await post(`${endpoint}/rascunho/update`, { price: 10000, capacity: "650 ml" });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ slug: "rascunho", active: false });
  const [row] = (await sql.execute("SELECT * FROM products WHERE slug = 'rascunho'")).rows;
  expect(row).toMatchObject({
    name: "Rascunho",
    price: 10000,
    active: 0,
    image: "/images/logo.png",
    specs: "Capacidade: 650 ml\nMaterial: Aço inox\nIsolamento: duplo",
  });
});

test("rejeita atualização de produto público e tentativa de ativar rascunho", async () => {
  expect((await post(`${endpoint}/publico/update`, { price: 123 })).status).toBe(404);
  expect((await post(`${endpoint}/rascunho/update`, { active: true })).status).toBe(400);
  const [row] = (await sql.execute("SELECT active, price FROM products WHERE slug = 'publico'"))
    .rows;
  expect(row).toMatchObject({ active: 1, price: null });
});

test("mantém rascunhos fora da lista, da consulta por slug e dos pedidos", async () => {
  const list = await rpc("products/list");
  expect(list.status).toBe(200);
  expect(await list.json()).toMatchObject({ json: [{ slug: "publico", active: true }] });
  expect((await rpc("products/get", { slug: "publico" })).status).toBe(200);
  expect((await rpc("products/get", { slug: "rascunho" })).status).toBe(404);
  const [row] = (await sql.execute("SELECT id FROM products WHERE slug = 'rascunho'")).rows;
  const order = await rpc("orders/create", {
    customerName: "Teste",
    customerPhone: "1234",
    items: [
      {
        productId: row.id,
        productName: "Rascunho",
        category: "Copos",
        color: "",
        engravingText: "",
        engravingFont: "",
        engravingOrientation: "",
        quantity: 1,
      },
    ],
  });
  expect(order.status).toBe(400);
  expect(await order.json()).toMatchObject({ json: { message: "Produto indisponível." } });
});

test("substitui capa e galeria e preserva os dados comerciais", async () => {
  const { upload } = mockStorage(png);
  const response = await post(`${endpoint}/rascunho/update`, { openaiFileIdRefs: [file] });
  expect(response.status).toBe(200);
  expect(upload).toHaveBeenCalledTimes(1);
  const [row] = (
    await sql.execute("SELECT image, media, active, name FROM products WHERE slug = 'rascunho'")
  ).rows;
  expect(row).toMatchObject({ media: "[]", active: 0, name: "Rascunho" });
  expect(row.image).toMatch(/^catalog\/chatgpt\/[0-9a-f]{64}\.webp$/);
});

test("rejeita fotos acima do limite antes de enviar ao armazenamento", async () => {
  const { upload } = mockStorage(new Uint8Array(8 * 1024 * 1024 + 1));
  const response = await post(endpoint, { ...draft, slug: "foto-grande" });
  expect(response.status).toBe(422);
  expect(upload).not.toHaveBeenCalled();
  expect(await response.json()).toMatchObject({ error: "Cada foto pode ter até 8 MiB." });
});
