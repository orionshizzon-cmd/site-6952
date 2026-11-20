import { useEffect, useMemo, useState } from "react";
import { X, Upload, Loader2, Check, Minus, Plus, ZoomIn } from "lucide-react";
import type { ProductDTO } from "../../api/database/schema";
import { useCart } from "./cart-provider";
import { useLightbox } from "./lightbox";
import { ENGRAVING_FONTS } from "../lib/constants";
import { formatBRL } from "../lib/money";
import { uploadCustomerImage, uploadSvgString } from "../lib/upload";
import { generateEngravingSvg } from "../lib/engraving-vector";
import { cardSpecs, parseSpecs } from "../lib/specs";

type Orientation = "horizontal" | "vertical";

export function CustomizeModal({
  product,
  onClose,
}: {
  product: ProductDTO;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  // Produtos marcados no admin como "sem personalização" não têm gravação.
  const customizable = product.customizable !== false;
  const colors = product.colors ?? [];
  const [color, setColor] = useState(colors[0]?.name ?? "");
  const [engravingText, setEngravingText] = useState("");
  const [engravingFont, setEngravingFont] = useState(ENGRAVING_FONTS[0].label);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [added, setAdded] = useState(false);

  // Galeria: capa + fotos adicionais cadastradas no admin
  const gallery = useMemo(() => {
    const extras = (product.media ?? [])
      .filter((m) => m.type === "image" && m.url)
      .map((m) => m.url as string);
    return [product.image, ...extras].filter(Boolean);
  }, [product]);
  const [activeImage, setActiveImage] = useState(0);
  const lightbox = useLightbox();

  // Ficha técnica cadastrada no admin (uma característica por linha).
  // Sem ficha cadastrada, mostra o que o produto já tem (cores/gravação).
  const specs = useMemo(() => {
    const parsed = parseSpecs(product.specs);
    return parsed.length > 0 ? parsed : cardSpecs(product, 4);
  }, [product]);
  // Descrição completa só aparece quando acrescenta algo à descrição curta
  const details = useMemo(() => {
    const full = (product.description ?? "").trim();
    return full && full !== (product.shortDescription ?? "").trim() ? full : "";
  }, [product.description, product.shortDescription]);
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Estoque: null/undefined = sem controle (ilimitado)
  const stock = product.stock;
  const maxQty = stock === null || stock === undefined ? Infinity : stock;

  const selectedFont = useMemo(
    () =>
      ENGRAVING_FONTS.find((f) => f.label === engravingFont) ??
      ENGRAVING_FONTS[0],
    [engravingFont],
  );
  const previewText = engravingText.trim() || "Seu nome";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCustomerImage(file);
      setImageUrl(url);
      setImageName(file.name);
    } catch {
      alert("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAdd() {
    const text = engravingText.trim();
    let engravingVectorUrl: string | null = null;

    // Gera a arte vetorizada (SVG) do nome na fonte escolhida
    if (customizable && text) {
      setGenerating(true);
      try {
        const svg = await generateEngravingSvg({
          text,
          fontLabel: engravingFont,
          orientation,
        });
        const filename = `gravacao-${product.slug}-${Date.now()}.svg`;
        engravingVectorUrl = await uploadSvgString(svg, filename);
      } catch {
        // Se falhar a vetorização, segue sem bloquear o pedido
        engravingVectorUrl = null;
      } finally {
        setGenerating(false);
      }
    }

    addItem({
      key: `${product.id}-${Date.now()}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      image: product.image,
      color,
      engravingText: customizable ? text : "",
      engravingFont: customizable ? engravingFont : "",
      engravingOrientation: orientation,
      unitPrice: product.price,
      engravingVectorUrl,
      imageUrl: customizable ? imageUrl : null,
      imageName: customizable ? imageName : null,
      quantity,
      notes: notes.trim() || undefined,
    });
    setAdded(true);
    setTimeout(onClose, 800);
  }

  const busy = generating || added;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-card sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid min-h-0 overflow-y-auto sm:grid-cols-[0.9fr_1.1fr] sm:items-start">
          {/* Imagem — produto inteiro na tela, sem corte e sem precisar de zoom */}
          <div className="relative flex flex-col bg-gradient-to-b from-secondary to-card sm:sticky sm:top-0">
            <button
              type="button"
              onClick={() =>
                lightbox.open(
                  gallery.map((src) => ({ src, alt: product.name })),
                  activeImage,
                )
              }
              aria-label={`Ampliar foto: ${product.name}`}
              className="group/zoom relative block w-full cursor-zoom-in appearance-none border-0 bg-transparent p-0"
            >
              <img
                src={gallery[activeImage] ?? product.image}
                alt={product.name}
                className="h-56 w-full object-contain p-4 sm:h-[340px] sm:p-5"
              />
              <span className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-opacity group-hover/zoom:opacity-100 sm:opacity-75">
                <ZoomIn className="h-4 w-4" />
              </span>
            </button>
            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto bg-card p-3">
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setActiveImage(i)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === activeImage
                        ? "border-gold"
                        : "border-transparent opacity-70"
                    }`}
                    aria-label={`Foto ${i + 1}`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full bg-secondary object-contain p-0.5"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Formulário */}
          <div className="p-6 sm:p-7">
            <p className="overline text-gold">{product.category}</p>
            <h3 className="mt-1 font-display text-2xl font-bold">
              {product.name}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {product.shortDescription}
            </p>
            <p className="mt-3 font-display text-2xl font-bold text-gold-deep">
              {formatBRL(product.price)}
            </p>

            {/* Características do produto */}
            {specs.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-xl border border-border bg-secondary/40">
                <p className="border-b border-border px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gold-deep">
                  Características
                </p>
                <dl className="divide-y divide-border/70">
                  {specs.map((s) => (
                    <div
                      key={`${s.label}-${s.value}`}
                      className="flex gap-3 px-4 py-2 text-sm even:bg-background/40"
                    >
                      {s.label ? (
                        <>
                          <dt className="w-2/5 shrink-0 text-muted-foreground">{s.label}</dt>
                          <dd className="flex-1 font-medium text-foreground">{s.value}</dd>
                        </>
                      ) : (
                        <dd className="flex items-start gap-2 text-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
                          {s.value}
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Descrição completa */}
            {details && (
              <div className="mt-4">
                <p className="text-sm font-semibold">Sobre o produto</p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {showAllDetails || details.length <= 320
                    ? details
                    : `${details.slice(0, 320).trimEnd()}…`}
                </p>
                {details.length > 320 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDetails((v) => !v)}
                    className="mt-1 text-sm font-semibold text-gold-deep"
                  >
                    {showAllDetails ? "Ver menos" : "Ver mais"}
                  </button>
                )}
              </div>
            )}

            {/* Cor */}
            {colors.length > 0 && (
              <div className="mt-5">
                <label className="text-sm font-semibold">Cor do produto</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.name)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                        color === c.name
                          ? "border-gold bg-accent font-semibold"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!customizable && (
              <div className="mt-5 rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                Este produto é vendido{" "}
                <strong className="font-semibold text-foreground">
                  sem gravação personalizada
                </strong>
                . Escolha {colors.length > 0 ? "a cor, " : ""}a quantidade e, se quiser, deixe uma
                observação.
              </div>
            )}

            {customizable && (
              <>
                {/* Texto de gravação */}
                <div className="mt-5">
                  <label className="text-sm font-semibold">
                    Texto para gravação
                  </label>
                  <input
                    value={engravingText}
                    onChange={(e) => setEngravingText(e.target.value)}
                    placeholder="Ex.: Rafael · 15/03/2025"
                    maxLength={40}
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
                  />
                </div>

                {/* Orientação */}
                <div className="mt-4">
                  <label className="text-sm font-semibold">
                    Orientação da gravação
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["horizontal", "vertical"] as Orientation[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => setOrientation(o)}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                          orientation === o
                            ? "border-gold bg-accent font-semibold"
                            : "border-border hover:border-foreground/40"
                        }`}
                      >
                        {o === "horizontal" ? (
                          <span className="text-base leading-none tracking-tight">
                            A B C
                          </span>
                        ) : (
                          <span className="flex flex-col text-[10px] leading-[1.05]">
                            <span>A</span>
                            <span>B</span>
                            <span>C</span>
                          </span>
                        )}
                        {o === "horizontal" ? "Horizontal" : "Vertical"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fonte da gravação */}
                <div className="mt-4">
                  <label className="text-sm font-semibold">
                    Fonte da gravação{" "}
                    <span className="font-normal text-muted-foreground">
                      ({ENGRAVING_FONTS.length} opções)
                    </span>
                  </label>
                  <div className="mt-2 grid max-h-52 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border bg-background p-2">
                    {ENGRAVING_FONTS.map((f) => (
                      <button
                        key={f.label}
                        onClick={() => setEngravingFont(f.label)}
                        className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition ${
                          engravingFont === f.label
                            ? "border-gold bg-accent"
                            : "border-transparent hover:border-border"
                        }`}
                      >
                        <span
                          className="w-full truncate text-lg leading-tight text-foreground"
                          style={{ fontFamily: f.family }}
                        >
                          {previewText}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview do nome */}
                <div className="mt-4">
                  <label className="text-sm font-semibold">
                    Prévia da gravação
                  </label>
                  <div className="mt-2 flex min-h-[120px] items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary p-5">
                    {orientation === "horizontal" ? (
                      <span
                        className="max-w-full break-words text-center text-3xl leading-tight text-foreground sm:text-4xl"
                        style={{ fontFamily: selectedFont.family }}
                      >
                        {previewText}
                      </span>
                    ) : (
                      <span
                        className="flex flex-col items-center text-3xl leading-[1.15] text-foreground sm:text-4xl"
                        style={{ fontFamily: selectedFont.family }}
                      >
                        {[...previewText].map((ch, i) => (
                          <span key={i}>{ch === " " ? "\u00A0" : ch}</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Ao adicionar ao carrinho, geramos uma arte vetorizada (SVG)
                    do nome nesta fonte para a gravação a laser.
                  </p>
                </div>

                {/* Upload */}
                <div className="mt-4">
                  <label className="text-sm font-semibold">
                    Foto ou logo (opcional)
                  </label>
                  <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm hover:border-gold">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gold" />
                    ) : imageUrl ? (
                      <Check className="h-5 w-5 text-whats" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="truncate text-muted-foreground">
                      {uploading
                        ? "Enviando..."
                        : imageName
                          ? imageName
                          : "Enviar imagem para gravar"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFile}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </>
            )}

            {/* Quantidade */}
            <div className="mt-4">
              <label className="text-sm font-semibold">
                Quantidade
                {maxQty !== Infinity && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {maxQty} disponível(is) em estoque
                  </span>
                )}
              </label>
              <div className="mt-2 inline-flex items-center rounded-lg border border-input">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Diminuir"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                  aria-label="Aumentar"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Observações */}
            <div className="mt-4">
              <label className="text-sm font-semibold">Observações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={
                  customizable
                    ? "Detalhes adicionais sobre a personalização..."
                    : "Detalhes adicionais sobre o pedido..."
                }
                className="mt-2 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-70"
            >
              {added ? (
                <>
                  <Check className="h-5 w-5" /> Adicionado ao carrinho
                </>
              ) : generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Gerando arte
                  vetorizada...
                </>
              ) : (
                <>
                  <ShoppingBagIcon /> Adicionar ao carrinho
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingBagIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
