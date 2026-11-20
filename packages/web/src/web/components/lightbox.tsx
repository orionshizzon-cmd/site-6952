import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

type LightboxImage = { src: string; alt?: string };

type LightboxContextValue = {
  /** Abre o visualizador. Passe o índice inicial quando houver várias imagens. */
  open: (images: LightboxImage[], startIndex?: number) => void;
};

const LightboxContext = createContext<LightboxContextValue | null>(null);

/** Versão que não lança erro fora do provider (retorna null). */
export function useLightboxOptional() {
  return useContext(LightboxContext);
}

export function useLightbox() {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error("useLightbox precisa estar dentro de LightboxProvider");
  return ctx;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<LightboxImage[] | null>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  const open = useCallback((imgs: LightboxImage[], startIndex = 0) => {
    const clean = imgs.filter((i) => Boolean(i.src));
    if (clean.length === 0) return;
    setImages(clean);
    setIndex(Math.min(Math.max(0, startIndex), clean.length - 1));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => setImages(null), []);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const go = useCallback(
    (delta: number) => {
      setImages((current) => {
        if (!current) return current;
        setIndex((i) => (i + delta + current.length) % current.length);
        return current;
      });
      reset();
    },
    [reset],
  );

  const zoomBy = useCallback((delta: number) => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z + delta).toFixed(2))));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!images) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "+" || e.key === "=") zoomBy(0.5);
      if (e.key === "-") zoomBy(-0.5);
      if (e.key === "0") reset();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [images, close, go, zoomBy, reset]);

  const current = images?.[index];

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}

      {images && current && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/92 backdrop-blur-sm"
          onClick={close}
        >
          {/* Barra de controles */}
          <div
            className="flex items-center justify-between gap-2 px-4 py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-semibold text-white/70">
              {images.length > 1 ? `${index + 1} / ${images.length}` : "Toque duplo para ampliar"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => zoomBy(-0.5)}
                disabled={zoom <= MIN_ZOOM}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
                aria-label="Reduzir zoom"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="w-12 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => zoomBy(0.5)}
                disabled={zoom >= MAX_ZOOM}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
                aria-label="Ampliar zoom"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={reset}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Restaurar zoom"
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={close}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Imagem */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-4"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              zoomBy(e.deltaY > 0 ? -0.25 : 0.25);
            }}
            onDoubleClick={() => (zoom > 1 ? reset() : setZoom(2.5))}
            onPointerDown={(e) => {
              if (zoom <= 1) return;
              dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d) return;
              setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onTouchStart={(e) => {
              if (e.touches.length !== 2) return;
              const [a, b] = [e.touches[0], e.touches[1]];
              pinchRef.current = {
                dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                zoom,
              };
            }}
            onTouchMove={(e) => {
              const p = pinchRef.current;
              if (!p || e.touches.length !== 2) return;
              const [a, b] = [e.touches[0], e.touches[1]];
              const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
              const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (dist / p.dist) * p.zoom));
              setZoom(Number(next.toFixed(2)));
            }}
            onTouchEnd={() => {
              pinchRef.current = null;
            }}
          >
            <img
              src={current.src}
              alt={current.alt ?? ""}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? "grab" : "zoom-in",
                transition: dragRef.current ? "none" : "transform 0.15s ease-out",
              }}
              onClick={() => zoom === 1 && setZoom(2.5)}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/25"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => go(1)}
                  className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/25"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Miniaturas */}
          {images.length > 1 && (
            <div
              className="flex justify-center gap-2 overflow-x-auto px-4 pb-5"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={img.src + i}
                  onClick={() => {
                    setIndex(i);
                    reset();
                  }}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    i === index ? "border-gold" : "border-transparent opacity-50 hover:opacity-90"
                  }`}
                  aria-label={`Ver imagem ${i + 1}`}
                >
                  <img src={img.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </LightboxContext.Provider>
  );
}
