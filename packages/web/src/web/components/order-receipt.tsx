// Recibo / Pedido (documento próprio, não é NF-e) para impressão e envio no WhatsApp.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Loader2, Printer, MessageCircle, X } from "lucide-react";
import type { Order, Issuer } from "../../api/database/schema";
import { BRAND, whatsappLink } from "../lib/constants";
import { formatBRL } from "../lib/money";

const PAYMENTS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro", "A combinar"] as const;

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 10mm; }
  body > *:not(#receipt-portal) { display: none !important; }
  #receipt-portal { position: static !important; inset: auto !important; padding: 0 !important; background: #fff !important; overflow: visible !important; display: block !important; }
  #receipt-portal .rc-noprint { display: none !important; }
  #receipt-portal .rc-scroll { overflow: visible !important; max-height: none !important; display: block !important; padding: 0 !important; }
  #receipt-portal, #receipt-portal * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  #receipt-portal .rc-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; border-radius: 0 !important; }
}
`;

function digitsPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("55")) return d;
  return `55${d}`;
}

function fmtDate(v: Date | string | number): string {
  return new Date(v).toLocaleDateString("pt-BR");
}

export function OrderReceiptModal({
  order,
  issuer,
  loading,
  onClose,
}: {
  order: Order;
  issuer?: Issuer | null;
  loading?: boolean;
  onClose: () => void;
}) {
  const [payment, setPayment] = useState<string>("Pix");
  const [deadline, setDeadline] = useState("");
  const [terms, setTerms] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  // Pré-preenche prazo/observações com os padrões do emitente quando carregarem
  useEffect(() => {
    if (issuer?.defaultDeadline) setDeadline((v) => v || issuer.defaultDeadline!);
    if (issuer?.defaultTerms) setTerms((v) => v || issuer.defaultTerms!);
  }, [issuer]);

  useEffect(() => {
    QRCode.toDataURL(whatsappLink(`Olá! Sobre o pedido ${order.code}`), {
      margin: 0,
      width: 220,
      color: { dark: "#111111", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [order.code]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const itemsTotal = useMemo(
    () => order.items.reduce((s, it) => s + (it.unitPrice ?? 0) * it.quantity, 0),
    [order.items],
  );
  const total = order.total || itemsTotal;

  const text = useMemo(() => {
    const lines: string[] = [];
    lines.push(`*${BRAND.name} — Recibo de pedido ${order.code}*`);
    lines.push(`Data: ${fmtDate(order.createdAt)}`);
    lines.push(`Cliente: ${order.customerName}`);
    lines.push("");
    lines.push("*Itens*");
    order.items.forEach((it) => {
      const det = [
        it.color && `cor ${it.color}`,
        it.engravingText && `gravação "${it.engravingText}"`,
        it.engravingFont && `fonte ${it.engravingFont}`,
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(
        `• ${it.quantity}× ${it.productName}${det ? ` (${det})` : ""} — ${formatBRL(it.unitPrice)}`,
      );
    });
    lines.push("");
    lines.push(`*Total: ${formatBRL(total)}*`);
    lines.push(`Pagamento: ${payment}${paid ? " (pago)" : ""}`);
    if (deadline) lines.push(`Prazo: ${deadline}`);
    if (terms) lines.push("");
    if (terms) lines.push(terms);
    lines.push("");
    lines.push(`${BRAND.name} · ${BRAND.whatsappDisplay} · ${BRAND.city}`);
    return lines.join("\n");
  }, [order, total, payment, paid, deadline, terms]);

  const waHref = `https://wa.me/${digitsPhone(order.customerPhone)}?text=${encodeURIComponent(text)}`;

  const iss = {
    name: issuer?.name || BRAND.name,
    legalName: issuer?.legalName || BRAND.company,
    doc: issuer?.doc || "",
    address: issuer?.address || BRAND.addressFull,
    phone: issuer?.phone || BRAND.whatsappDisplay,
    email: issuer?.email || "",
    instagram: issuer?.instagram || `@${BRAND.instagram}`,
  };

  return createPortal(
    <div
      id="receipt-portal"
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
    >
      <style>{PRINT_CSS}</style>

      {/* Barra de ações (não sai na impressão) */}
      <div className="rc-noprint mx-auto mb-4 flex max-w-[820px] flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="font-display text-lg font-bold text-neutral-900">
          Recibo do pedido {order.code}
        </h3>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />}
        <button
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          <X className="h-4 w-4" /> Fechar
        </button>

        <div className="w-full border-t border-neutral-200 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-neutral-700">
              Forma de pagamento
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
              >
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-neutral-700">
              Prazo de entrega
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="Ex.: até 3 dias úteis"
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
              />
            </label>
            <label className="text-xs font-semibold text-neutral-700 sm:col-span-2">
              Observações / condições
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="h-4 w-4"
              />
              Marcar como PAGO
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800"
            >
              <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" /> Enviar cópia no WhatsApp
            </a>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Documento interno (recibo/pedido). Não substitui nota fiscal.
          </p>
        </div>
      </div>

      {/* Documento */}
      <div className="rc-scroll mx-auto max-w-[820px]">
        <div
          className="rc-sheet mx-auto rounded-2xl bg-white p-8 shadow-2xl sm:p-10"
          style={{ color: "#141414", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {/* Cabeçalho */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            <img
              src="/images/logo-black.png"
              alt={iss.name}
              style={{ height: 74, width: "auto", objectFit: "contain" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.02em", margin: 0 }}>
                {iss.name}
              </p>
              <p style={{ fontSize: 11, color: "#6b6b6b", margin: "2px 0 0" }}>
                {iss.legalName}
                {iss.doc ? ` · CNPJ/CPF ${iss.doc}` : ""}
              </p>
              <p style={{ fontSize: 11, color: "#6b6b6b", margin: "2px 0 0" }}>{iss.address}</p>
              <p style={{ fontSize: 11, color: "#6b6b6b", margin: "2px 0 0" }}>
                {iss.phone}
                {iss.email ? ` · ${iss.email}` : ""} · {iss.instagram}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#8a6d1f",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                Recibo de pedido
              </p>
              <p style={{ fontSize: 22, fontWeight: 800, margin: "2px 0 0" }}>{order.code}</p>
              <p style={{ fontSize: 11, color: "#6b6b6b", margin: "2px 0 0" }}>
                {fmtDate(order.createdAt)}
              </p>
              {paid && (
                <p
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    border: "1.5px solid #1a7f37",
                    color: "#1a7f37",
                    borderRadius: 999,
                    padding: "2px 10px",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                  }}
                >
                  PAGO
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              height: 3,
              background: "linear-gradient(90deg,#c9a227,#141414)",
              borderRadius: 2,
              margin: "18px 0",
            }}
          />

          {/* Cliente */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <p style={labelCss}>Cliente</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "2px 0 0" }}>
                {order.customerName}
              </p>
              <p style={{ fontSize: 12, color: "#6b6b6b", margin: 0 }}>{order.customerPhone}</p>
            </div>
            <div>
              <p style={labelCss}>Serviço</p>
              <p style={{ fontSize: 13, margin: "2px 0 0" }}>
                Personalização e gravação a laser sob medida
              </p>
            </div>
            <div>
              <p style={labelCss}>Pagamento</p>
              <p style={{ fontSize: 13, margin: "2px 0 0" }}>{payment}</p>
            </div>
          </div>

          {/* Itens */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
            <thead>
              <tr style={{ background: "#141414", color: "#fff" }}>
                <th style={{ ...thCss, textAlign: "left" }}>Item e personalização</th>
                <th style={{ ...thCss, width: 46, textAlign: "center" }}>Qtd</th>
                <th style={{ ...thCss, width: 92, textAlign: "right" }}>Unit.</th>
                <th style={{ ...thCss, width: 100, textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e6e6e6" }}>
                  <td style={tdCss}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{it.productName}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "#5b5b5b" }}>
                      {[
                        it.color && `Cor: ${it.color}`,
                        it.engravingText && `Gravação: “${it.engravingText}”`,
                        it.engravingFont && `Fonte: ${it.engravingFont}`,
                        it.engravingOrientation &&
                          `Sentido: ${it.engravingOrientation === "vertical" ? "Vertical" : "Horizontal"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {it.notes && (
                      <p style={{ margin: "3px 0 0", fontSize: 11, color: "#5b5b5b" }}>
                        Obs.: {it.notes}
                      </p>
                    )}
                  </td>
                  <td style={{ ...tdCss, textAlign: "center" }}>{it.quantity}</td>
                  <td style={{ ...tdCss, textAlign: "right" }}>{formatBRL(it.unitPrice)}</td>
                  <td style={{ ...tdCss, textAlign: "right", fontWeight: 700 }}>
                    {it.unitPrice == null ? "—" : formatBRL(it.unitPrice * it.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <div
              style={{
                minWidth: 240,
                border: "1.5px solid #141414",
                borderRadius: 12,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <span style={{ ...labelCss, margin: 0 }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{formatBRL(total)}</span>
            </div>
          </div>

          {/* Prazo, obs e observações do pedido */}
          <div style={{ marginTop: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", minWidth: 260 }}>
              {deadline && (
                <>
                  <p style={labelCss}>Prazo de entrega</p>
                  <p style={{ fontSize: 12, margin: "2px 0 10px" }}>{deadline}</p>
                </>
              )}
              {order.note && (
                <>
                  <p style={labelCss}>Observações do cliente</p>
                  <p style={{ fontSize: 12, margin: "2px 0 10px" }}>{order.note}</p>
                </>
              )}
              {terms && (
                <>
                  <p style={labelCss}>Condições</p>
                  <p style={{ fontSize: 11, color: "#5b5b5b", margin: "2px 0 0", lineHeight: 1.5 }}>
                    {terms}
                  </p>
                </>
              )}
            </div>
            <div style={{ textAlign: "center" }}>
              {qr && (
                <img src={qr} alt="QR Code do WhatsApp" style={{ width: 96, height: 96 }} />
              )}
              <p style={{ fontSize: 9, color: "#6b6b6b", margin: "6px 0 0", maxWidth: 110 }}>
                Fale com a gente no WhatsApp {BRAND.whatsappDisplay}
              </p>
            </div>
          </div>

          {/* Assinaturas */}
          <div style={{ display: "flex", gap: 32, marginTop: 34 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #141414", paddingTop: 6 }}>
                <p style={{ fontSize: 10, color: "#5b5b5b", margin: 0 }}>
                  Assinatura do cliente
                </p>
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #141414", paddingTop: 6 }}>
                <p style={{ fontSize: 10, color: "#5b5b5b", margin: 0 }}>{iss.name}</p>
              </div>
            </div>
          </div>

          <p
            style={{
              marginTop: 22,
              textAlign: "center",
              fontSize: 9,
              color: "#8a8a8a",
              letterSpacing: "0.06em",
            }}
          >
            Documento de recibo/pedido emitido por {iss.name} — não substitui nota fiscal.{" "}
            {BRAND.slogan}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const labelCss: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#8a6d1f",
  fontWeight: 700,
  margin: 0,
};

const thCss: React.CSSProperties = {
  fontSize: 9.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  padding: "8px 10px",
  fontWeight: 700,
};

const tdCss: React.CSSProperties = { padding: "9px 10px", fontSize: 12, verticalAlign: "top" };
