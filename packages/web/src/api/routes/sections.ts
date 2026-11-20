import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";

const input = z.object({
  key: z.string().min(1),
  emoji: z.string().nullable().optional(),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  categoryFilter: z.string().nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const sections = {
  list: base.handler(() =>
    db
      .select()
      .from(schema.homeSections)
      .orderBy(asc(schema.homeSections.sortOrder), asc(schema.homeSections.id)),
  ),

  listAll: adminBase.handler(() =>
    db
      .select()
      .from(schema.homeSections)
      .orderBy(asc(schema.homeSections.sortOrder), asc(schema.homeSections.id)),
  ),

  create: adminBase.input(input).handler(async ({ input }) => {
    const [created] = await db.insert(schema.homeSections).values(input).returning();
    return created;
  }),

  update: adminBase
    .input(input.partial().extend({ id: z.number().int() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [updated] = await db
        .update(schema.homeSections)
        .set(rest)
        .where(eq(schema.homeSections.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Seção não encontrada" });
      return updated;
    }),

  remove: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.homeSections).where(eq(schema.homeSections.id, input.id));
    return { ok: true as const };
  }),
};
