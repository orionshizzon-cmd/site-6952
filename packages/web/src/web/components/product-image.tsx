import { ImageIcon, ZoomIn } from "lucide-react";
import { useLightboxOptional } from "./lightbox";

// Placeholder elegante "Foto em atualização" usado quando um produto ainda
// não tem fotografia real cadastrada (image vazia).
// Quando `zoom` está ativo, clicar na imagem abre o visualizador em tela cheia.
export function ProductImage({
  src,
  alt,
  className = "",
  zoom = true,
  zoomImages,
  zoomIndex = 0,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Habilita abrir em tela cheia com zoom ao clicar. Default: true */
  zoom?: boolean;
  /** Conjunto de imagens para navegar no visualizador (default: só a própria). */
  zoomImages?: (string | null | undefined)[];
  zoomIndex?: number;
}) {
  const lightbox = useLightboxOptional();

  if (!src) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink to-[#1c1c20] text-white/70 ${className}`}
        role="img"
        aria-label={`${alt} — foto em atualização`}
      >
        <ImageIcon className="h-8 w-8 text-gold/70" />
        <span className="px-3 text-center text-xs font-semibold uppercase tracking-widest text-gold/80">
          Foto em atualização
        </span>
      </div>
    );
  }

  const canZoom = zoom && Boolean(lightbox);

  const img = (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );

  if (!canZoom) return img;

  const list = (zoomImages && zoomImages.length > 0 ? zoomImages : [src]).filter(
    Boolean,
  ) as string[];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        lightbox?.open(
          list.map((s) => ({ src: s, alt })),
          Math.min(zoomIndex, list.length - 1),
        );
      }}
      aria-label={`Ampliar foto: ${alt}`}
      className="group/zoom absolute inset-0 h-full w-full cursor-zoom-in appearance-none border-0 bg-transparent p-0"
    >
      {img}
      <span className="pointer-events-none absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover/zoom:opacity-100 sm:opacity-70">
        <ZoomIn className="h-4 w-4" />
      </span>
    </button>
  );
}
