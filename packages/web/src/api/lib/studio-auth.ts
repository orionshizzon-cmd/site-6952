import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import type { StudioUser } from "../database/schema";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function secret(): string {
  return (
    process.env.STUDIO_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "rafa-studio-dev-secret-change-me"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Gera o hash da senha no formato "salt:hash" (scrypt). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Confere a senha contra o hash salvo. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const attempt = scryptSync(password, salt, 64).toString("hex");
    return safeEqual(attempt, hash);
  } catch {
    return false;
  }
}

/** Token de sessão assinado com o id do usuário. */
export function issueStudioToken(userId: number): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const encoded = Buffer.from(`${userId}.${exp}`).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function parseToken(token: string | null | undefined): number | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (!safeEqual(signature, sign(encoded))) return null;
  try {
    const [rawId, rawExp] = Buffer.from(encoded, "base64url").toString("utf8").split(".");
    const id = Number(rawId);
    const exp = Number(rawExp);
    if (!Number.isFinite(id) || !Number.isFinite(exp)) return null;
    if (Date.now() >= exp) return null;
    return id;
  } catch {
    return null;
  }
}

function extractToken(headers: Headers): string | null {
  const direct = headers.get("x-studio-token") || headers.get("X-Studio-Token");
  if (direct) return direct.trim();
  return null;
}

/** Carrega o usuário do Studio a partir do token, validando bloqueio. */
async function currentUser(headers: Headers): Promise<StudioUser> {
  const id = parseToken(extractToken(headers));
  if (!id) {
    throw new ORPCError("UNAUTHORIZED", { message: "Sessão expirada. Entre novamente." });
  }
  const [user] = await db
    .select()
    .from(schema.studioUsers)
    .where(eq(schema.studioUsers.id, id));
  if (!user) {
    throw new ORPCError("UNAUTHORIZED", { message: "Usuário não encontrado." });
  }
  if (user.blocked) {
    throw new ORPCError("FORBIDDEN", { message: "Seu acesso está bloqueado." });
  }
  return user;
}

/** Procedure protegida: exige usuário do Studio autenticado e ativo. */
export const studioBase = base.use(async ({ context, next }) => {
  const user = await currentUser(context.headers);
  return next({ context: { ...context, studioUser: user } });
});

/** Procedure protegida: exige o proprietário. */
export const ownerBase = studioBase.use(async ({ context, next }) => {
  if (context.studioUser.role !== "owner") {
    throw new ORPCError("FORBIDDEN", { message: "Apenas o proprietário pode fazer isso." });
  }
  return next();
});

/** O proprietário tem créditos ilimitados. */
export function hasUnlimitedCredits(user: StudioUser): boolean {
  return user.role === "owner";
}
