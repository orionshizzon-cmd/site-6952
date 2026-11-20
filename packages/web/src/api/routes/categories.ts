import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";
import { UNCATEGORIZED } from "../database/schema";

// Garante que uma categoria exista na tabela (usado ao salvar produtos).
export async function ensureCategory(name: string): Promise<void> {
  const clean = name.trim();
  if (!clean || clean === UNCATEGORIZED) return;
  const [existing] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.name, clean));
  if (existing) return;
  const rows = await db.select().from(schema.categories);
  const nextOrder = rows.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;
  await db.insert(schema.categories).values({ name: clean, sortOrder: nextOrder });
}

export const categories = {
  // Lista pública de categorias (ordenadas)
  list: base.handler(async () => {
    return db
      .select()
      .from(schema.categories)
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
  }),

  // ----- Admin -----
  create: adminBase
    .input(z.object({ name: z.string().min(1) }))
    .handler(async ({ input }) => {
      const name = input.name.trim();
      const [existing] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.name, name));
      if (existing) throw new ORPCError("CONFLICT", { message: "Categoria já existe." });
      const rows = await db.select().from(schema.categories);
      const nextOrder = rows.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;
      const [created] = await db
        .insert(schema.categories)
        .values({ name, sortOrder: nextOrder })
        .returning();
      return created;
    }),

  // Renomeia e atualiza todos os produtos daquela categoria
  rename: adminBase
    .input(z.object({ id: z.number().int(), name: z.string().min(1) }))
    .handler(async ({ input }) => {
      const name = input.name.trim();
      const [current] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, input.id));
      if (!current) throw new ORPCError("NOT_FOUND", { message: "Categoria não encontrada." });

      const [clash] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.name, name));
      if (clash && clash.id !== input.id)
        throw new ORPCError("CONFLICT", { message: "Já existe uma categoria com esse nome." });

      const [updated] = await db
        .update(schema.categories)
        .set({ name })
        .where(eq(schema.categories.id, input.id))
        .returning();
      // Propaga o novo nome para os produtos
      await db
        .update(schema.products)
        .set({ category: name })
        .where(eq(schema.products.category, current.name));
      return updated;
    }),

  // Exclui a categoria e move os produtos para "Sem categoria"
  remove: adminBase
    .input(z.object({ id: z.number().int() }))
    .handler(async ({ input }) => {
      const [current] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, input.id));
      if (!current) throw new ORPCError("NOT_FOUND", { message: "Categoria não encontrada." });

      await db
        .update(schema.products)
        .set({ category: UNCATEGORIZED })
        .where(eq(schema.products.category, current.name));
      await db.delete(schema.categories).where(eq(schema.categories.id, input.id));
      return { ok: true as const };
    }),

  // Reordena categorias (lista de ids na nova ordem)
  reorder: adminBase
    .input(z.object({ ids: z.array(z.number().int()) }))
    .handler(async ({ input }) => {
      await Promise.all(
        input.ids.map((id, index) =>
          db
            .update(schema.categories)
            .set({ sortOrder: index })
            .where(eq(schema.categories.id, id)),
        ),
      );
      return { ok: true as const };
    }),
};
