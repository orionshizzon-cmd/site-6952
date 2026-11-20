import { z } from "zod";
import { asc, desc, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import * as schema from "../database/schema";
import type { StudioUser } from "../database/schema";
import { signGetUrl } from "../lib/s3";
import { hashPassword, ownerBase } from "../lib/studio-auth";

const MAX_BETA_USERS = 5;

function publicUser(user: StudioUser) {
  const { passwordHash: _drop, ...rest } = user;
  return rest;
}

export const studioOwner = {
  // ===== Usuários Beta =====
  users: ownerBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.studioUsers)
      .orderBy(asc(schema.studioUsers.role), asc(schema.studioUsers.id));
    const counts = await db
      .select({ userId: schema.studioProjects.userId, total: sql<number>`count(*)` })
      .from(schema.studioProjects)
      .groupBy(schema.studioProjects.userId);
    const map = new Map(counts.map((c) => [c.userId, Number(c.total)]));
    return rows.map((u) => ({ ...publicUser(u), projectCount: map.get(u.id) ?? 0 }));
  }),

  createUser: ownerBase
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().min(3),
        password: z.string().min(4),
        credits: z.number().int().min(0).default(20),
      }),
    )
    .handler(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const [existing] = await db
        .select()
        .from(schema.studioUsers)
        .where(eq(schema.studioUsers.email, email));
      if (existing) {
        throw new ORPCError("CONFLICT", { message: "Já existe um usuário com esse e-mail." });
      }
      const betas = await db
        .select({ total: sql<number>`count(*)` })
        .from(schema.studioUsers)
        .where(eq(schema.studioUsers.role, "beta"));
      if (Number(betas[0]?.total ?? 0) >= MAX_BETA_USERS) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Limite de ${MAX_BETA_USERS} usuários beta atingido. Exclua um acesso para criar outro.`,
        });
      }
      const [created] = await db
        .insert(schema.studioUsers)
        .values({
          name: input.name.trim(),
          email,
          passwordHash: hashPassword(input.password),
          role: "beta",
          credits: input.credits,
        })
        .returning();
      return publicUser(created);
    }),

  updateUser: ownerBase
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).optional(),
        email: z.string().min(3).optional(),
        credits: z.number().int().min(0).optional(),
        blocked: z.boolean().optional(),
        password: z.string().min(4).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, password, email, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (email) data.email = email.trim().toLowerCase();
      if (password) data.passwordHash = hashPassword(password);
      const [updated] = await db
        .update(schema.studioUsers)
        .set(data)
        .where(eq(schema.studioUsers.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Usuário não encontrado." });
      return publicUser(updated);
    }),

  deleteUser: ownerBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input, context }) => {
      if (input.id === context.studioUser.id) {
        throw new ORPCError("BAD_REQUEST", { message: "Você não pode excluir o próprio acesso." });
      }
      const [target] = await db
        .select()
        .from(schema.studioUsers)
        .where(eq(schema.studioUsers.id, input.id));
      if (!target) throw new ORPCError("NOT_FOUND", { message: "Usuário não encontrado." });
      if (target.role === "owner") {
        throw new ORPCError("BAD_REQUEST", { message: "Não é possível excluir o proprietário." });
      }
      await db.delete(schema.studioImages).where(eq(schema.studioImages.userId, input.id));
      await db.delete(schema.studioProjects).where(eq(schema.studioProjects.userId, input.id));
      await db.delete(schema.studioUsers).where(eq(schema.studioUsers.id, input.id));
      return { ok: true as const };
    }),

  // ===== Projetos de todos os usuários =====
  allProjects: ownerBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.studioProjects)
      .orderBy(desc(schema.studioProjects.updatedAt));
    const users = await db.select().from(schema.studioUsers);
    const nameMap = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((p) => ({ ...p, userName: nameMap.get(p.userId) ?? "—" }));
  }),

  // ===== Estilos de IA (prompts editáveis) =====
  styles: ownerBase.handler(async () =>
    db.select().from(schema.studioStyles).orderBy(asc(schema.studioStyles.sortOrder)),
  ),

  saveStyle: ownerBase
    .input(
      z.object({
        id: z.number().int().optional(),
        slug: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional().nullable(),
        prompt: z.string().min(10),
        credits: z.number().int().min(0),
        multiImage: z.boolean().default(false),
        active: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      if (id) {
        const [updated] = await db
          .update(schema.studioStyles)
          .set(data)
          .where(eq(schema.studioStyles.id, id))
          .returning();
        return updated;
      }
      const [created] = await db.insert(schema.studioStyles).values(data).returning();
      return created;
    }),

  deleteStyle: ownerBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.studioStyles).where(eq(schema.studioStyles.id, input.id));
    return { ok: true as const };
  }),

  // ===== Medidas =====
  saveSize: ownerBase
    .input(
      z.object({
        id: z.number().int().optional(),
        label: z.string().optional().nullable(),
        widthMm: z.number().int().min(1),
        heightMm: z.number().int().min(1),
        sortOrder: z.number().int().default(0),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      if (id) {
        const [updated] = await db
          .update(schema.studioSizes)
          .set(data)
          .where(eq(schema.studioSizes.id, id))
          .returning();
        return updated;
      }
      const [created] = await db.insert(schema.studioSizes).values(data).returning();
      return created;
    }),

  deleteSize: ownerBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.studioSizes).where(eq(schema.studioSizes.id, input.id));
    return { ok: true as const };
  }),

  // ===== Produtos do Studio =====
  saveProduct: ownerBase
    .input(
      z.object({
        id: z.number().int().optional(),
        name: z.string().min(1),
        models: z.string().optional().nullable(),
        sortOrder: z.number().int().default(0),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      if (id) {
        const [updated] = await db
          .update(schema.studioProducts)
          .set(data)
          .where(eq(schema.studioProducts.id, id))
          .returning();
        return updated;
      }
      const [created] = await db.insert(schema.studioProducts).values(data).returning();
      return created;
    }),

  deleteProduct: ownerBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.studioProducts).where(eq(schema.studioProducts.id, input.id));
    return { ok: true as const };
  }),

  // ===== Modelos de mockup (estrutura pronta para a fase 2) =====
  mockups: ownerBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.studioMockups)
      .orderBy(asc(schema.studioMockups.sortOrder));
    return Promise.all(
      rows.map(async (m) => ({ ...m, url: m.imageKey ? await signGetUrl(m.imageKey) : null })),
    );
  }),

  saveMockup: ownerBase
    .input(
      z.object({
        id: z.number().int().optional(),
        name: z.string().min(1),
        kind: z.string().min(1),
        imageKey: z.string().optional().nullable(),
        finish: z.string().default("prata"),
        sortOrder: z.number().int().default(0),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      if (id) {
        const [updated] = await db
          .update(schema.studioMockups)
          .set(data)
          .where(eq(schema.studioMockups.id, id))
          .returning();
        return updated;
      }
      const [created] = await db.insert(schema.studioMockups).values(data).returning();
      return created;
    }),

  deleteMockup: ownerBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.studioMockups).where(eq(schema.studioMockups.id, input.id));
    return { ok: true as const };
  }),

  // ===== Feedbacks =====
  feedbacks: ownerBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.studioFeedback)
      .orderBy(desc(schema.studioFeedback.createdAt));
    return Promise.all(
      rows.map(async (f) => ({ ...f, url: f.imageKey ? await signGetUrl(f.imageKey) : null })),
    );
  }),

  deleteFeedback: ownerBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input }) => {
      await db.delete(schema.studioFeedback).where(eq(schema.studioFeedback.id, input.id));
      return { ok: true as const };
    }),

  // ===== Relatório de uso =====
  report: ownerBase.handler(async () => {
    const [users, projects, images, byStyle, log] = await Promise.all([
      db.select({ total: sql<number>`count(*)` }).from(schema.studioUsers),
      db.select({ total: sql<number>`count(*)` }).from(schema.studioProjects),
      db.select({ total: sql<number>`count(*)` }).from(schema.studioImages),
      db
        .select({
          styleSlug: schema.studioCreditLog.styleSlug,
          uses: sql<number>`count(*)`,
          credits: sql<number>`sum(${schema.studioCreditLog.amount})`,
        })
        .from(schema.studioCreditLog)
        .groupBy(schema.studioCreditLog.styleSlug),
      db
        .select()
        .from(schema.studioCreditLog)
        .orderBy(desc(schema.studioCreditLog.createdAt))
        .limit(30),
    ]);
    return {
      totals: {
        users: Number(users[0]?.total ?? 0),
        projects: Number(projects[0]?.total ?? 0),
        images: Number(images[0]?.total ?? 0),
      },
      byStyle: byStyle.map((s) => ({
        styleSlug: s.styleSlug ?? "—",
        uses: Number(s.uses),
        credits: Number(s.credits ?? 0),
      })),
      recent: log,
      aiConfigured: Boolean(process.env.AI_GATEWAY_API_KEY && process.env.AI_GATEWAY_BASE_URL),
    };
  }),
};
