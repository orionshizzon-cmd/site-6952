import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Loader2 } from "lucide-react";
import { buildPixPayload, PIX_RECEIVER } from "../lib/pix";
import { formatBRL } from "../lib/money";

// Seção de pagamento via Pix — gera o QR Code e o "copia e cola"
// com o valor total do pedido.
export function PixPayment({
  amountCents,
  txid,
}: {
  amountCents: number;
  txid?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const payload = useMemo(
    () =>
      buildPixPayload({
        ...PIX_RECEIVER,
        amountCents,
        txid,
      }),
    [amountCents, txid],
  );

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(payload, { margin: 1, width: 320, errorCorrectionLevel: "M" })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [payload]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Pague com Pix</h2>
        <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-gold-deep">
          {formatBRL(amountCents)}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Escaneie o QR Code no app do seu banco ou use o Pix Copia e Cola. O valor já vem
        preenchido.
      </p>

      <div className="mt-5 flex flex-col items-center">
        <div className="flex h-[240px] w-[240px] items-center justify-center rounded-xl border border-border bg-white p-3">
          {qr ? (
            <img src={qr} alt="QR Code Pix" className="h-full w-full" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="mt-4 w-full">
          <label className="text-sm font-semibold">Pix Copia e Cola</label>
          <div className="mt-1.5 flex gap-2">
            <input
              readOnly
              value={payload}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 truncate rounded-lg border border-input bg-background px-3 py-2.5 text-xs text-muted-foreground outline-none"
            />
            <button
              onClick={copy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-gold hover:text-black"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-secondary p-4 text-sm">
        <p className="font-semibold">Dados do recebedor</p>
        <p className="mt-1 text-muted-foreground">
          Francisco Rafael Alves da Silva
          <br />
          Chave Pix (telefone): <strong className="text-foreground">99 99155-3836</strong>
        </p>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Após o pagamento, envie o comprovante pelo WhatsApp para confirmarmos e iniciarmos a
        produção do seu pedido.
      </p>
    </div>
  );
}
