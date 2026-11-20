import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "motion/react";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  MessageCircle,
  Loader2,
  CheckCircle2,
  ImageIcon,
} from "lucide-react";
import { useCart } from "../components/cart-provider";
import { useCreateOrder } from "../queries/orders";
import { PixPayment } from "../components/pix-payment";
import { buildOrderMessage } from "../lib/order-message";
import { whatsappLink } from "../lib/constants";
import { formatBRL } from "../lib/money";

function EmptyCart() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-20">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
          <ShoppingBag className="h-7 w-7 text-gold-deep" />
        </div>
        <h1 className="font-display text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="max-w-sm text-muted-foreground">
          Adicione produtos personalizados para montar seu pedido.
        </p>
        <Link
          to="/produtos"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
        >
          Ver produtos
        </Link>
      </div>
    </div>
  );
}

function CarrinhoPage() {
  const { items, updateItem, removeItem, clear } = useCart();
  const createOrder = useCreateOrder();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<{ code: string; total: number } | null>(null);
  const [errors, setErrors] = useState<{ name?: boolean; phone?: boolean }>({});
  const [stockError, setStockError] = useState<string | null>(null);

  // Total do carrinho (centavos) e se todos os itens têm preço definido
  const total = useMemo(
    () => items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0),
    [items],
  );
  const hasAllPrices = useMemo(
    () => items.length > 0 && items.every((i) => i.unitPrice != null && i.unitPrice > 0),
    [items],
  );

  if (items.length === 0 && !done) return <EmptyCart />;

  async function handleSubmit() {
    const nextErrors = { name: !name.trim(), phone: !phone.trim() };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.phone) return;
    setStockError(null);

    try {
      const order = await createOrder.mutateAsync({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        note: note.trim() || undefined,
        total,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.name,
          category: i.category,
          color: i.color,
          engravingText: i.engravingText,
          engravingFont: i.engravingFont,
          engravingOrientation: i.engravingOrientation,
          engravingVectorUrl: i.engravingVectorUrl ?? null,
          imageUrl: i.imageUrl ?? null,
          unitPrice: i.unitPrice ?? null,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });

      const message = buildOrderMessage({
        code: order.code,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        note,
        items,
        total,
      });

      window.open(whatsappLink(message), "_blank");
      setDone({ code: order.code, total });
      clear();
    } catch (err) {
      // Mensagem de estoque insuficiente vem da API
      const message =
        err && typeof err === "object" && "message" in err ? String(err.message) : "";
      setStockError(
        message.includes("estoque") || message.includes("esgotado")
          ? message
          : "Não foi possível enviar o pedido. Tente novamente.",
      );
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg"
        >
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-whats" />
            <h1 className="font-display text-2xl font-bold">Pedido registrado!</h1>
            <p className="text-muted-foreground">
              Seu pedido <strong className="text-foreground">{done.code}</strong> foi registrado e
              aberto no WhatsApp.
            </p>
          </div>

          {done.total > 0 && (
            <div className="mt-6">
              <PixPayment amountCents={done.total} txid={done.code} />
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            <a
              href={whatsappLink(`Olá! Sobre meu pedido ${done.code}...`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-whats px-6 py-3 text-sm font-bold text-white"
            >
              <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
            </a>
            <Link
              to="/produtos"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Continuar comprando
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12">
      <p className="overline text-gold">Carrinho</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold sm:text-5xl">Seu carrinho</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Revise os itens e a personalização. Ao finalizar, seu pedido é registrado e você pode pagar
        via Pix com o valor total já calculado.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Itens */}
        <div className="space-y-4">
          {items.map((item) => {
            const lineTotal = (item.unitPrice ?? 0) * item.quantity;
            return (
              <div key={item.key} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-24 w-24 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="overline text-gold">{item.category}</p>
                      <h3 className="font-display text-base font-semibold leading-snug">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 text-sm font-semibold text-gold-deep">
                        {formatBRL(item.unitPrice)}
                        {item.quantity > 1 && item.unitPrice != null && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            × {item.quantity} = {formatBRL(lineTotal)}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.key)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Cor: <strong className="text-foreground">{item.color || "—"}</strong></span>
                    {item.engravingFont ? (
                      <>
                        <span>Fonte: <strong className="text-foreground">{item.engravingFont}</strong></span>
                        <span>Orientação: <strong className="text-foreground">{item.engravingOrientation === "vertical" ? "Vertical" : "Horizontal"}</strong></span>
                      </>
                    ) : (
                      <span>Sem gravação personalizada</span>
                    )}
                    {item.engravingText && (
                      <span>
                        Gravação: <strong className="text-foreground">"{item.engravingText}"</strong>
                      </span>
                    )}
                    {item.engravingVectorUrl && (
                      <a
                        href={item.engravingVectorUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-gold-deep hover:underline"
                      >
                        <ImageIcon className="h-3.5 w-3.5" /> Ver arte vetorizada
                      </a>
                    )}
                    {item.imageUrl && (
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-gold-deep hover:underline"
                      >
                        <ImageIcon className="h-3.5 w-3.5" /> Ver imagem
                      </a>
                    )}
                  </div>
                  {item.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">Obs: {item.notes}</p>
                  )}

                  <div className="mt-3 inline-flex items-center rounded-lg border border-input">
                    <button
                      onClick={() =>
                        updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })
                      }
                      className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Diminuir"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                      className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={clear}
            className="text-sm font-semibold text-muted-foreground hover:text-destructive"
          >
            Esvaziar carrinho
          </button>
        </div>

        {/* Finalização */}
        <div className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-bold">Resumo do pedido</h2>

          <div className="mt-4 flex items-center justify-between border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-2xl font-bold text-gold-deep">
              {formatBRL(total)}
            </span>
          </div>
          {!hasAllPrices && (
            <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
              Alguns itens estão como "Sob consulta". Finalize pelo WhatsApp para receber o valor e
              a chave Pix.
            </p>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className={`mt-1.5 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold ${
                  errors.name ? "border-destructive" : "border-input"
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">Informe seu nome.</p>}
            </div>
            <div>
              <label className="text-sm font-semibold">WhatsApp / Telefone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(99) 99999-9999"
                className={`mt-1.5 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold ${
                  errors.phone ? "border-destructive" : "border-input"
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-destructive">Informe seu telefone.</p>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold">Observações gerais</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Prazo desejado, forma de entrega, etc."
                className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>

          {stockError && (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {stockError}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={createOrder.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          >
            {createOrder.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Registrando...
              </>
            ) : (
              <>Finalizar pedido</>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Seu pedido é registrado, aberto no WhatsApp e você paga via Pix.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CarrinhoPage;
