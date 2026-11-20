import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";
import type { PhotoStep, PhotoStepDTO } from "../database/schema";
import { signGetUrl } from "../lib/s3";

async function serialize(item: PhotoStep): Promise<PhotoStepDTO> {
  return { ...item, imageKey: item.image, url: await signGetUrl(item.image) };
}

const input = z.object({
  image: z.string().min(1),
  label: z.string().min(1),
  text: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const photoSteps = {
  list: base.handler(async () => {
    const rows = await db
      .select()
      .from(schema.photoSteps)
      .orderBy(asc(schema.photoSteps.sortOrder), asc(schema.photoSteps.id));
    return Promise.all(rows.filter((r) => r.active).map(serialize));
  }),

  listAll: adminBase.handler(async () => {
    const rows = await db
      .select()
      .from(schema.photoSteps)
      .orderBy(asc(schema.photoSteps.sortOrder), asc(schema.photoSteps.id));
    return Promise.all(rows.map(serialize));
  }),

  create: adminBase.input(input).handler(async ({ input }) => {
    const [created] = await db.insert(schema.photoSteps).values(input).returning();
    return serialize(created);
  }),

  update: adminBase
    .input(input.partial().extend({ id: z.number().int() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [updated] = await db
        .update(schema.photoSteps)
        .set(rest)
        .where(eq(schema.photoSteps.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Etapa não encontrada" });
      return serialize(updated);
    }),

  remove: adminBase.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
    await db.delete(schema.photoSteps).where(eq(schema.photoSteps.id, input.id));
    return { ok: true as const };
  }),
};
