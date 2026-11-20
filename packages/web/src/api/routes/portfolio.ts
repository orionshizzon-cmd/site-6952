import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";
import type { PortfolioItem, PortfolioDTO } from "../database/schema";
import { signGetUrl } from "../lib/s3";

async function serialize(item: PortfolioItem): Promise<PortfolioDTO> {
  return { ...item, imageKey: item.image, url: await signGetUrl(item.image) };
}

const input = z.object({
  image: z.string().min(1),
  label: z.string().min(1),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const portfolio = {
  // Portfólio público (somente itens ativos)
  list: base.handler(async () => {
    const rows = await db
      .select()
      .from(schema.portfolio)
      .orderBy(asc(schema.portfolio.sortOrder), asc(schema.portfolio.id));
    return Promise.all(rows.filter((r) => r.active).map(serialize));
  }),

  // Lista completa para o admin
  listAll: adminBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.portfolio)
      .orderBy(asc(schema.portfolio.sortOrder), asc(schema.portfolio.id));
    return Promise.all(rows.map(serialize));
  }),

  create: adminBase.input(input).handler(async ({ input }) => {
    const [created] = await db.insert(schema.portfolio).values(input).returning();
    return serialize(created);
  }),

  update: adminBase
    .input(input.partial().extend({ id: z.number().int() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [updated] = await db
        .update(schema.portfolio)
        .set(rest)
        .where(eq(schema.portfolio.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Item não encontrado" });
      return serialize(updated);
    }),

  remove: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.portfolio).where(eq(schema.portfolio.id, input.id));
    return { ok: true as const };
  }),

  reorder: adminBase
    .input(z.object({ ids: z.array(z.number().int()) }))
    .handler(async ({ input }) => {
      await Promise.all(
        input.ids.map((id, index) =>
          db.update(schema.portfolio).set({ sortOrder: index }).where(eq(schema.portfolio.id, id)),
        ),
      );
      return { ok: true as const };
    }),
};
