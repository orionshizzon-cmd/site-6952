import { z } from "zod";
import { eq } from "drizzle-orm";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";

const ROW_ID = 1;

const DEFAULTS = {
  name: "Rafa Laser",
  legalName: "Rafart Stores",
  doc: "",
  address: "Rua Principal, 173, Parque Vitória, Imperatriz - MA, CEP 65915-784",
  phone: "(99) 99155-3836",
  email: "",
  instagram: "@rafa.laser",
  defaultTerms:
    "Peça personalizada: a gravação é conferida e aprovada pelo cliente antes da produção. Não trocamos peças personalizadas por desistência.",
  defaultDeadline: "Até 3 dias úteis após aprovação da arte e do pagamento.",
};

const input = z.object({
  name: z.string().min(1),
  legalName: z.string().nullable().optional(),
  doc: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  defaultTerms: z.string().nullable().optional(),
  defaultDeadline: z.string().nullable().optional(),
});

export const issuerRoutes = {
  // Devolve os dados do emitente, criando a linha padrão na primeira chamada.
  get: adminBase.handler(async () => {
    const [row] = await db.select().from(schema.issuer).where(eq(schema.issuer.id, ROW_ID));
    if (row) return row;
    const [created] = await db
      .insert(schema.issuer)
      .values({ id: ROW_ID, ...DEFAULTS })
      .returning();
    return created;
  }),

  update: adminBase.input(input).handler(async ({ input }) => {
    const [row] = await db.select().from(schema.issuer).where(eq(schema.issuer.id, ROW_ID));
    if (!row) {
      const [created] = await db
        .insert(schema.issuer)
        .values({ id: ROW_ID, ...DEFAULTS, ...input })
        .returning();
      return created;
    }
    const [updated] = await db
      .update(schema.issuer)
      .set(input)
      .where(eq(schema.issuer.id, ROW_ID))
      .returning();
    return updated;
  }),
};

// Alias de nome único do arquivo (convenção de rotas): `issuer` === `issuerRoutes`.
export const issuer = issuerRoutes;
