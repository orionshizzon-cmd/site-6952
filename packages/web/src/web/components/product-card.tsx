import { motion } from "motion/react";
import { Sparkles, MessageCircle, Check } from "lucide-react";
import type { ProductDTO } from "../../api/database/schema";
import { formatBRL } from "../lib/money";
import { whatsappLink } from "../lib/constants";
import { ProductImage } from "./product-image";
import { cardSpecs } from "../lib/specs";

export function ProductCard({
  product,
  onCustomize,
}: {
  product: ProductDTO;
  onCustomize: (p: ProductDTO) => void;
}) {
  const stock = product.stock;
  const soldOut = stock !== null && stock !== undefined && stock <= 0;
  const lowStock = !soldOut && stock !== null && stock !== undefined && stock <= 3;

  // Características mostradas no cartão (ficha técnica cadastrada).
  const specs = cardSpecs(product);

  // Capa + fotos adicionais: clicar abre o visualizador em tela cheia.
  const gallery = [
    product.image,
    ...(product.media ?? []).filter((m) => m.type === "image" && m.url).map((m) => m.url as string),
  ].filter(Boolean) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.25)]"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-secondary to-card">
        {/* object-contain: o produto aparece inteiro, sem corte nem zoom */}
        <ProductImage
          src={product.image}
          alt={product.name}
          zoomImages={gallery}
          className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
          {product.category}
        </span>
        {soldOut && (
          <>
            <span className="pointer-events-none absolute inset-0 bg-background/55" />
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              Esgotado
            </span>
          </>
        )}
        {lowStock && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-gold px-3 py-1 text-[11px] font-bold text-black">
            Últimas {stock} unidades
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug">{product.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {product.shortDescription}
        </p>

        {/* Características do produto */}
        {specs.length > 0 && (
          <ul className="mt-3 flex-1 space-y-1.5">
            {specs.map((s) => (
              <li key={`${s.label}-${s.value}`} className="flex items-start gap-1.5 text-xs">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" />
                <span className="text-muted-foreground">
                  {s.label && <span className="font-semibold text-foreground">{s.label}: </span>}
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        )}
        {specs.length === 0 && <div className="flex-1" />}

        <p className="mt-3 font-display text-lg font-bold text-gold-deep">
          {formatBRL(product.price)}
        </p>

        <div className="mt-3 flex items-center gap-1.5">
          {(product.colors ?? []).slice(0, 5).map((c) => (
            <span
              key={c.name}
              title={c.name}
              className="h-4 w-4 rounded-full border border-black/10"
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        {soldOut ? (
          <a
            href={whatsappLink(
              `Olá! Vi que o produto "${product.name}" está esgotado no site. Consigo encomendar?`,
            )}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-full border border-whats px-4 py-2.5 text-sm font-semibold text-whats transition-colors hover:bg-whats hover:text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Esgotado — encomendar
          </a>
        ) : (
          <button
            onClick={() => onCustomize(product)}
            className="mt-4 flex items-center justify-center gap-2 rounded-full border border-foreground bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:border-gold hover:bg-gold hover:text-black"
          >
            <Sparkles className="h-4 w-4" />
            {product.customizable === false ? "Comprar" : "Personalizar"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
