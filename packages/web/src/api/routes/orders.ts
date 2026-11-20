import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase } from "../lib/admin-auth";
import { db } from "../database";
import * as schema from "../database/schema";

const STATUSES = [
  "Rascunho",
  "Enviado",
  "Aguardando resposta",
  "Aprovado",
  "Recusado",
  "Aguardando entrada",
  "Em produção",
  "Finalizado",
  "Entregue",
  "Cancelado",
] as const;

const orderItemSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  category: z.string(),
  color: z.string(),
  engravingText: z.string(),
  engravingFont: z.string(),
  engravingOrientation: z.string(),
  engravingVectorUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  unitPrice: z.number().int().min(0).nullable().optional(),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

function generateCode() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RL-${y}${m}-${rand}`;
}

export const orders = {
  create: base
    .input(
      z.object({
        customerName: z.string().min(1),
        customerPhone: z.string().min(1),
        note: z.string().optional(),
        total: z.number().int().min(0).default(0),
        items: z.array(orderItemSchema).min(1),
      }),
    )
    .handler(async ({ input }) => {
      // Valida o estoque antes de registrar o pedido (produtos com estoque controlado)
      const needed = new Map<number, number>();
      for (const item of input.items) {
        needed.set(item.productId, (needed.get(item.productId) ?? 0) + item.quantity);
      }
      const ids = [...needed.keys()];
      const rows = ids.length
        ? await db.select().from(schema.products).where(inArray(schema.products.id, ids))
        : [];
      for (const product of rows) {
        if (!product.active) {
          throw new ORPCError("BAD_REQUEST", { message: "Produto indisponível." });
        }
        if (product.stock === null || product.stock === undefined) continue;
        const qty = needed.get(product.id) ?? 0;
        if (product.stock < qty) {
          throw new ORPCError("BAD_REQUEST", {
            message:
              product.stock === 0
                ? `"${product.name}" está esgotado no momento. Fale com a gente pelo WhatsApp para encomendar.`
                : `Temos apenas ${product.stock} unidade(s) de "${product.name}" em estoque. Ajuste a quantidade no carrinho.`,
          });
        }
      }

      const [order] = await db
        .insert(schema.orders)
        .values({
          code: generateCode(),
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          note: input.note ?? null,
          total: input.total,
          items: input.items,
          status: "Aguardando resposta",
        })
        .returning();

      // Baixa no estoque dos produtos controlados
      for (const product of rows) {
        if (product.stock === null || product.stock === undefined) continue;
        const qty = needed.get(product.id) ?? 0;
        if (qty <= 0) continue;
        await db
          .update(schema.products)
          .set({ stock: Math.max(0, product.stock - qty) })
          .where(eq(schema.products.id, product.id));
      }

      return order;
    }),

  list: adminBase.handler(() =>
    db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)),
  ),

  updateStatus: adminBase
    .input(z.object({ id: z.number(), status: z.enum(STATUSES) }))
    .handler(async ({ input }) => {
      const [current] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, input.id));
      if (!current) throw new ORPCError("NOT_FOUND", { message: "Pedido não encontrado" });

      const [updated] = await db
        .update(schema.orders)
        .set({ status: input.status })
        .where(eq(schema.orders.id, input.id))
        .returning();

      // Ao cancelar um pedido, as unidades voltam para o estoque
      if (input.status === "Cancelado" && current.status !== "Cancelado") {
        const back = new Map<number, number>();
        for (const item of current.items ?? []) {
          back.set(item.productId, (back.get(item.productId) ?? 0) + item.quantity);
        }
        const ids = [...back.keys()];
        if (ids.length) {
          const rows = await db
            .select()
            .from(schema.products)
            .where(inArray(schema.products.id, ids));
          for (const product of rows) {
            if (product.stock === null || product.stock === undefined) continue;
            await db
              .update(schema.products)
              .set({ stock: product.stock + (back.get(product.id) ?? 0) })
              .where(eq(schema.products.id, product.id));
          }
        }
      }

      return updated;
    }),

  // Exclui pedidos definitivamente (usado no admin para limpar a lista).
  remove: adminBase
    .input(z.object({ ids: z.array(z.number().int()).min(1) }))
    .handler(async ({ input }) => {
      await db.delete(schema.orders).where(inArray(schema.orders.id, input.ids));
      return { ok: true as const, deleted: input.ids.length };
    }),
};
