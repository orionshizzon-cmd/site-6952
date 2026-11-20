import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";

const input = z.object({
  name: z.string().min(1),
  city: z.string().nullable().optional(),
  text: z.string().min(1),
  rating: z.number().int().min(1).max(5).default(5),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const testimonials = {
  // Depoimentos públicos (somente ativos)
  list: base.handler(async () => {
    const rows = await db
      .select()
      .from(schema.testimonials)
      .orderBy(asc(schema.testimonials.sortOrder), asc(schema.testimonials.id));
    return rows.filter((r) => r.active);
  }),

  listAll: adminBase.handler(() =>
    db
      .select()
      .from(schema.testimonials)
      .orderBy(asc(schema.testimonials.sortOrder), asc(schema.testimonials.id)),
  ),

  create: adminBase.input(input).handler(async ({ input }) => {
    const [created] = await db.insert(schema.testimonials).values(input).returning();
    return created;
  }),

  update: adminBase
    .input(input.partial().extend({ id: z.number().int() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [updated] = await db
        .update(schema.testimonials)
        .set(rest)
        .where(eq(schema.testimonials.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Depoimento não encontrado" });
      return updated;
    }),

  remove: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.testimonials).where(eq(schema.testimonials.id, input.id));
    return { ok: true as const };
  }),
};
