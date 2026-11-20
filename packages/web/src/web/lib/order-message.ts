import type { CartItem } from "../types/cart";
import { formatBRL } from "./money";

// Monta a mensagem do pedido para o WhatsApp (pt-BR)
export function buildOrderMessage(params: {
  code: string;
  customerName: string;
  customerPhone: string;
  note?: string;
  items: CartItem[];
  total?: number;
}) {
  const { code, customerName, customerPhone, note, items, total } = params;
  const lines: string[] = [];

  lines.push("*Novo pedido — Rafa Laser*");
  lines.push(`Código: ${code}`);
  lines.push(`Cliente: ${customerName}`);
  lines.push(`WhatsApp: ${customerPhone}`);
  lines.push("");
  lines.push("*Itens:*");

  items.forEach((item, idx) => {
    const lineTotal = (item.unitPrice ?? 0) * item.quantity;
    lines.push(`${idx + 1}. ${item.name} (${item.category})`);
    lines.push(`   • Cor: ${item.color || "—"}`);
    // Produtos sem personalização não têm texto/fonte de gravação
    if (item.engravingFont || item.engravingText) {
      lines.push(`   • Gravação: ${item.engravingText ? `"${item.engravingText}"` : "—"}`);
      if (item.engravingFont) lines.push(`   • Fonte: ${item.engravingFont}`);
      lines.push(
        `   • Orientação: ${item.engravingOrientation === "vertical" ? "Vertical" : "Horizontal"}`,
      );
    } else {
      lines.push(`   • Sem gravação personalizada`);
    }
    lines.push(`   • Quantidade: ${item.quantity}`);
    lines.push(
      `   • Valor: ${formatBRL(item.unitPrice)}${
        item.quantity > 1 && item.unitPrice != null ? ` (subtotal ${formatBRL(lineTotal)})` : ""
      }`,
    );
    if (item.engravingVectorUrl) lines.push(`   • Arte vetorizada (SVG): ${item.engravingVectorUrl}`);
    if (item.imageUrl) lines.push(`   • Foto/Logo: ${item.imageUrl}`);
    if (item.notes) lines.push(`   • Observações: ${item.notes}`);
    lines.push("");
  });

  if (total && total > 0) {
    lines.push(`*Total: ${formatBRL(total)}*`);
    lines.push("");
  }

  if (note && note.trim()) {
    lines.push(`*Observações gerais:* ${note.trim()}`);
    lines.push("");
  }

  lines.push("Quero finalizar meu pedido. Obrigado!");
  return lines.join("\n");
}
