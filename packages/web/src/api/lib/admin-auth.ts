import { createHmac, timingSafeEqual } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function sessionSecret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET || process.env.BETTER_AUTH_SECRET;
}

function adminUsername(): string {
  return process.env.ADMIN_USERNAME || "shizzonkay";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// Compara duas strings em tempo constante
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Valida usuário e senha contra as variáveis de ambiente
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = adminUsername();
  const expectedPass = process.env.ADMIN_PASSWORD || "";
  if (!expectedPass || !sessionSecret()) return false;
  return safeEqual(username.trim(), expectedUser) && safeEqual(password, expectedPass);
}

// Gera um token assinado (usuário + expiração)
export function issueToken(): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("Segredo da sessão administrativa não configurado.");
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${adminUsername()}.${exp}`;
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

// Verifica assinatura e validade do token
export function verifyToken(token: string | null | undefined): boolean {
  const secret = sessionSecret();
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  if (!safeEqual(signature, sign(encoded, secret))) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const exp = Number(payload.split(".")[1]);
    return Number.isFinite(exp) && Date.now() < exp;
  } catch {
    return false;
  }
}

function extractToken(headers: Headers): string | null {
  const auth = headers.get("authorization") || headers.get("Authorization");
  if (!auth) return null;
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
}

// Procedure base protegida — exige token de admin válido
export const adminBase = base.use(async ({ context, next }) => {
  const token = extractToken(context.headers);
  if (!verifyToken(token)) {
    throw new ORPCError("UNAUTHORIZED", { message: "Acesso restrito ao administrador." });
  }
  return next();
});
