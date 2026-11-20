import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import { personalizations as table } from "../database/schema";
import { engravingFonts, engravingStatuses } from "../../shared/engraving-fonts";
import { engravingSvg } from "../lib/engraving-svg";

const codeInput = z.object({ code: z.string().trim().toUpperCase().regex(/^RL[0-9A-F]{16}$/) });
async function find(code: string) {
  const [row] = await db.select().from(table).where(eq(table.code, code));
  if (!row) throw new ORPCError("NOT_FOUND", { message: "Código não encontrado. Confira a leitura ou digite novamente." });
  return row;
}
function publicRecord(row: typeof table.$inferSelect) {
  const { code, name, fontId, fontName, status, createdAt } = row;
  return { code, name, fontId, fontName, status, createdAt };
}
export const personalizations = {
  create: base.input(z.object({
    name: z.string().min(1).max(60).refine(s => /^[\p{L}\p{M} ]+$/u.test(s) && s.trim().length > 0, "Use letras, acentos e espaços (até 60 caracteres)."),
    fontId: z.string().refine(s => engravingFonts.some(f => f.id === s), "Fonte inválida."),
    requestKey: z.string().uuid(),
  })).handler(async ({ input }) => {
    const name = input.name.normalize("NFC");
    const font = engravingFonts.find(f => f.id === input.fontId)!;
    const [saved] = await db.insert(table).values({
      id: randomUUID(), code: `RL${randomBytes(8).toString("hex").toUpperCase()}`,
      requestKey: input.requestKey, name, fontId: input.fontId, fontName: font.name,
      createdAt: new Date().toISOString(),
    }).onConflictDoNothing({ target: table.requestKey }).returning();
    const row = saved ?? (await db.select().from(table).where(eq(table.requestKey, input.requestKey)))[0];
    if (!row || row.name !== name || row.fontId !== input.fontId) throw new ORPCError("CONFLICT", { message: "Esta confirmação já foi usada. Comece outra personalização." });
    return publicRecord(row);
  }),
  get: base.input(codeInput).handler(async ({ input }) => publicRecord(await find(input.code))),
  list: adminBase.handler(() => db.select().from(table).orderBy(desc(table.createdAt)).limit(1000)),
  lookup: adminBase.input(codeInput).handler(({ input }) => find(input.code)),
  update: adminBase.input(codeInput.extend({ status: z.enum(engravingStatuses), maxWidthMm: z.number().int().min(5).max(500) })).handler(async ({ input }) => {
    await find(input.code);
    const [row] = await db.update(table).set({ status: input.status, maxWidthMm: input.maxWidthMm }).where(eq(table.code, input.code)).returning();
    return row;
  }),
  exportSvg: adminBase.input(codeInput.extend({ maxWidthMm: z.number().int().min(5).max(500) })).handler(async ({ input }) => {
    const row = await find(input.code);
    try {
      return { ...(await engravingSvg(row.name, row.fontId, input.maxWidthMm)), filename: `${row.code}-${row.fontId}.svg` };
    } catch (error) {
      if (!(error instanceof ORPCError)) console.error("SVG export failed:", error);
      throw error;
    }
  }),
};