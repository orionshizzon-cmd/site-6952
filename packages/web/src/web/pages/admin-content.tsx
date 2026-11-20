import { useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Star,
  X,
  ImageIcon,
} from "lucide-react";
import type {
  BannerDTO,
  HomeSection,
  PhotoStepDTO,
  PortfolioDTO,
  Testimonial,
} from "../../api/database/schema";
import {
  useAdminBanners,
  useSaveBanner,
  useDeleteBanner,
} from "../queries/banners";
import {
  useAdminPortfolio,
  useSavePortfolioItem,
  useDeletePortfolioItem,
} from "../queries/portfolio";
import {
  useAdminTestimonials,
  useSaveTestimonial,
  useDeleteTestimonial,
} from "../queries/testimonials";
import { useAdminSections, useSaveSection, useDeleteSection } from "../queries/sections";
import {
  useAdminPhotoSteps,
  useSavePhotoStep,
  useDeletePhotoStep,
} from "../queries/photo-steps";
import { useCategories } from "../queries/categories";
import { uploadFileReturnKey } from "../lib/upload";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-6 sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-background/80"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-display text-xl font-bold">{title}</h3>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

// ============================ BANNERS ============================
export function BannersTab() {
  const banners = useAdminBanners(true);
  const save = useSaveBanner();
  const del = useDeleteBanner();
  const [editing, setEditing] = useState<BannerDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const list = banners.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">
            Banners da página inicial{" "}
            <span className="text-muted-foreground">({list.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Espaço editável no topo do site para promoções e avisos. O primeiro banner ativo
            aparece em destaque. Adicione seus vídeos em “Novo banner” ou “Editar”.
            No site, eles tocam automaticamente, sem som e em loop.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Novo banner
        </button>
      </div>

      {banners.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3"
            >
              {b.url ? (
                <img src={b.url} alt={b.title} className="h-16 w-24 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold">{b.title}</h3>
                  {b.badge && (
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">
                      {b.badge}
                    </span>
                  )}
                  {!b.active && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      inativo
                    </span>
                  )}
                </div>
                {b.text && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{b.text}</p>
                )}
                <p className="mt-0.5 text-[11px] text-muted-foreground">Ordem: {b.sortOrder}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => save.mutate({ id: b.id, active: !b.active, title: b.title })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-gold"
                  aria-label={b.active ? "Desativar" : "Ativar"}
                  title={b.active ? "Desativar" : "Ativar"}
                >
                  {b.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditing(b)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-gold"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir o banner "${b.title}"?`)) del.mutate(b.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-destructive hover:text-destructive"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              Nenhum banner. Clique em "Novo banner" para anunciar uma promoção.
            </p>
          )}
        </div>
      )}

      {(editing || creating) && (
        <BannerForm
          banner={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function BannerForm({ banner, onClose }: { banner: BannerDTO | null; onClose: () => void }) {
  const save = useSaveBanner();
  const [image, setImage] = useState<string | null>(banner?.imageKey ?? null);
  const [preview, setPreview] = useState<string | null>(banner?.url ?? null);
  const [uploading, setUploading] = useState(false);
  // Mídias extras (fotos e vídeos) que aparecem em carrossel no banner
  const [extras, setExtras] = useState<{ kind: "image" | "video"; key: string; url: string }[]>(
    () =>
      (banner?.mediaList ?? [])
        .filter((m) => m.key !== banner?.imageKey)
        .map((m) => ({ kind: m.kind, key: m.key, url: m.url })),
  );
  const [badge, setBadge] = useState(banner?.badge ?? "Promoção");
  const [title, setTitle] = useState(banner?.title ?? "");
  const [text, setText] = useState(banner?.text ?? "");
  const [ctaLabel, setCtaLabel] = useState(banner?.ctaLabel ?? "Quero saber mais");
  const [ctaUrl, setCtaUrl] = useState(banner?.ctaUrl ?? "");
  const [whatsappMessage, setWhatsappMessage] = useState(banner?.whatsappMessage ?? "");
  const [sortOrder, setSortOrder] = useState(String(banner?.sortOrder ?? 0));
  const [active, setActive] = useState(banner?.active ?? true);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const { key, url } = await uploadFileReturnKey(file);
      setImage(key);
      setPreview(url);
    } finally {
      setUploading(false);
    }
  }

  async function handleExtras(files: File[]) {
    setUploading(true);
    try {
      for (const file of files) {
        const { key, url, type } = await uploadFileReturnKey(file);
        setExtras((prev) => [...prev, { kind: type, key, url }]);
      }
    } finally {
      setUploading(false);
    }
  }

  function moveExtra(index: number, dir: -1 | 1) {
    setExtras((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit() {
    if (!title.trim()) return;
    const media = [
      ...(image ? [{ kind: "image" as const, key: image }] : []),
      ...extras.map((m) => ({ kind: m.kind, key: m.key })),
    ];
    await save.mutateAsync({
      id: banner?.id,
      media: media.length ? media : null,
      image,
      badge: badge.trim() || null,
      title: title.trim(),
      text: text.trim() || null,
      ctaLabel: ctaLabel.trim() || null,
      ctaUrl: ctaUrl.trim() || null,
      whatsappMessage: whatsappMessage.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      active,
    });
    onClose();
  }

  return (
    <Modal title={banner ? "Editar banner" : "Novo banner"} onClose={onClose}>
      <label className="block cursor-pointer">
        <span className="text-sm font-semibold">Imagem (opcional)</span>
        <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
          {preview ? (
            <img src={preview} alt="" className="h-20 w-28 rounded-lg object-cover" />
          ) : (
            <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {preview ? "Trocar imagem" : "Enviar imagem"}
          </span>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>
      {preview && (
        <button
          onClick={() => {
            setImage(null);
            setPreview(null);
          }}
          className="mt-2 text-xs font-semibold text-destructive"
        >
          Remover imagem
        </button>
      )}

      <div className="mt-4 rounded-xl border border-dashed border-border p-3">
        <p className="text-sm font-semibold">Vídeos promocionais e fotos do banner</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Envie seu vídeo para exibir na página inicial: reprodução automática, sem som e em loop.
          Recomendamos MP4 curto (5–15 segundos). Para começar pelo vídeo, remova a imagem principal
          e deixe o vídeo em primeiro nesta lista. Você pode remover e enviar outro vídeo para trocá-lo.
          Quando houver mais de uma mídia, o banner vira um carrossel no site.
        </p>

        {extras.length > 0 && (
          <div className="mt-3 space-y-2">
            {extras.map((m, i) => (
              <div key={m.key} className="flex items-center gap-3 rounded-lg bg-secondary p-2">
                {m.kind === "video" ? (
                  <video src={m.url} className="h-14 w-20 rounded-md bg-black object-cover" muted />
                ) : (
                  <img src={m.url} alt="" className="h-14 w-20 rounded-md object-cover" />
                )}
                <span className="flex-1 text-xs font-semibold text-muted-foreground">
                  {m.kind === "video" ? "Vídeo" : "Foto"} {i + 1}
                </span>
                <button
                  onClick={() => moveExtra(i, -1)}
                  disabled={i === 0}
                  className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-40"
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveExtra(i, 1)}
                  disabled={i === extras.length - 1}
                  className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-40"
                  aria-label="Descer"
                >
                  ↓
                </button>
                <button
                  onClick={() => setExtras((prev) => prev.filter((x) => x.key !== m.key))}
                  className="rounded-md border border-border px-2 py-1 text-xs text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Inserir vídeos ou fotos
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) handleExtras(files);
            }}
          />
        </label>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Selo (ex.: Promoção, Novidade)</label>
        <input value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls} />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Título *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Garrafas térmicas por R$ 60,00"
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Texto</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className={inputCls}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Texto do botão</label>
          <input
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="Vazio = sem botão"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Ordem</label>
          <input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            inputMode="numeric"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Mensagem do WhatsApp</label>
        <input
          value={whatsappMessage}
          onChange={(e) => setWhatsappMessage(e.target.value)}
          placeholder="Mensagem já preenchida ao clicar no botão"
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Link do botão (opcional)</label>
        <input
          value={ctaUrl}
          onChange={(e) => setCtaUrl(e.target.value)}
          placeholder="Vazio = abre o WhatsApp"
          className={inputCls}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Banner ativo (visível no site)
      </label>

      <div className="mt-6 flex gap-2">
        <button
          onClick={submit}
          disabled={save.isPending || uploading || !title.trim()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
        <button
          onClick={onClose}
          className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

// ============================ PORTFÓLIO ============================
export function PortfolioTab() {
  const portfolio = useAdminPortfolio(true);
  const save = useSavePortfolioItem();
  const del = useDeletePortfolioItem();
  const [editing, setEditing] = useState<PortfolioDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const list = portfolio.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">
            Peças reais, clientes reais <span className="text-muted-foreground">({list.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fotos da seção "Clientes Rafa Laser → Peças reais, clientes reais" na página inicial.
            Elas aparecem na ordem definida abaixo e abrem com zoom quando o cliente clica.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Nova foto
        </button>
      </div>

      {portfolio.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <img src={item.url} alt={item.label} className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Ordem: {item.sortOrder} {item.active ? "" : "• inativo"}
                  </p>
                </div>
                <button
                  onClick={() => save.mutate({ id: item.id, active: !item.active })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-gold"
                  aria-label={item.active ? "Desativar" : "Ativar"}
                >
                  {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditing(item)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-gold"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir "${item.label}" do portfólio?`)) del.mutate(item.id);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-destructive hover:text-destructive"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">
              Nenhuma foto no portfólio ainda.
            </p>
          )}
        </div>
      )}

      {(editing || creating) && (
        <PortfolioForm
          item={editing}
          nextOrder={list.length}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function PortfolioForm({
  item,
  nextOrder,
  onClose,
}: {
  item: PortfolioDTO | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const save = useSavePortfolioItem();
  const [image, setImage] = useState<string | null>(item?.imageKey ?? null);
  const [preview, setPreview] = useState<string | null>(item?.url ?? null);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState(item?.label ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(item?.active ?? true);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const { key, url } = await uploadFileReturnKey(file);
      setImage(key);
      setPreview(url);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!image || !label.trim()) return;
    await save.mutateAsync({
      id: item?.id,
      image,
      label: label.trim(),
      sortOrder: Number(sortOrder) || 0,
      active,
    });
    onClose();
  }

  return (
    <Modal title={item ? "Editar foto" : "Nova foto de peça real"} onClose={onClose}>
      <label className="block cursor-pointer">
        <span className="text-sm font-semibold">Imagem *</span>
        <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
          {preview ? (
            <img src={preview} alt="" className="h-20 w-28 rounded-lg object-cover" />
          ) : (
            <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {preview ? "Trocar imagem" : "Enviar imagem"}
          </span>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      <div className="mt-4">
        <label className="text-sm font-semibold">Legenda *</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex.: Garrafas e copos"
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Ordem</label>
        <input
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          inputMode="numeric"
          className={inputCls}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Visível no site
      </label>

      <div className="mt-6 flex gap-2">
        <button
          onClick={submit}
          disabled={save.isPending || uploading || !image || !label.trim()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
        <button
          onClick={onClose}
          className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

// ============================ DEPOIMENTOS ============================
export function TestimonialsTab() {
  const testimonials = useAdminTestimonials(true);
  const save = useSaveTestimonial();
  const del = useDeleteTestimonial();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [creating, setCreating] = useState(false);

  const list = testimonials.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">
            Depoimentos <span className="text-muted-foreground">({list.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aparecem na página inicial. Desative ou exclua os que não quiser mostrar.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Novo depoimento
        </button>
      </div>

      {testimonials.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{t.name}</p>
                    {t.city && <span className="text-xs text-muted-foreground">{t.city}</span>}
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                      ))}
                    </span>
                    {!t.active && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        inativo
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{t.text}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => save.mutate({ id: t.id, active: !t.active })}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-gold"
                    aria-label={t.active ? "Desativar" : "Ativar"}
                  >
                    {t.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setEditing(t)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-gold"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir o depoimento de ${t.name}?`)) del.mutate(t.id);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-destructive hover:text-destructive"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              Nenhum depoimento cadastrado.
            </p>
          )}
        </div>
      )}

      {(editing || creating) && (
        <TestimonialForm
          item={editing}
          nextOrder={list.length}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function TestimonialForm({
  item,
  nextOrder,
  onClose,
}: {
  item: Testimonial | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const save = useSaveTestimonial();
  const [name, setName] = useState(item?.name ?? "");
  const [city, setCity] = useState(item?.city ?? "Imperatriz-MA");
  const [text, setText] = useState(item?.text ?? "");
  const [rating, setRating] = useState(item?.rating ?? 5);
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(item?.active ?? true);

  async function submit() {
    if (!name.trim() || !text.trim()) return;
    await save.mutateAsync({
      id: item?.id,
      name: name.trim(),
      city: city.trim() || null,
      text: text.trim(),
      rating,
      sortOrder: Number(sortOrder) || 0,
      active,
    });
    onClose();
  }

  return (
    <Modal title={item ? "Editar depoimento" : "Novo depoimento"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Nome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-semibold">Cidade</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Depoimento *</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Nota</label>
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              aria-label={`${n} estrelas`}
              className="p-1"
            >
              <Star
                className={`h-6 w-6 ${n <= rating ? "fill-gold text-gold" : "text-border"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Ordem</label>
        <input
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          inputMode="numeric"
          className={inputCls}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Visível no site
      </label>

      <div className="mt-6 flex gap-2">
        <button
          onClick={submit}
          disabled={save.isPending || !name.trim() || !text.trim()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
        <button
          onClick={onClose}
          className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

// ============================ SEÇÕES SAZONAIS ============================
export function SectionsTab() {
  const sections = useAdminSections(true);
  const save = useSaveSection();
  const del = useDeleteSection();
  const categories = useCategories();
  const [editing, setEditing] = useState<HomeSection | null>(null);
  const [creating, setCreating] = useState(false);

  const list = sections.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">
            Seções sazonais <span className="text-muted-foreground">({list.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vitrines temáticas da home (ex.: "🎁 Presentes para o Dia dos Pais"). Escolha a
            categoria de produtos que aparece na seção.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Nova seção
        </button>
      </div>

      {sections.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((sec) => (
            <div
              key={sec.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <span className="text-2xl">{sec.emoji ?? "✨"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{sec.title}</p>
                  {!sec.active && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      inativo
                    </span>
                  )}
                </div>
                {sec.subtitle && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{sec.subtitle}</p>
                )}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Produtos: {sec.categoryFilter ?? "destaques"} • Ordem: {sec.sortOrder}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => save.mutate({ id: sec.id, active: !sec.active })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-gold"
                  aria-label={sec.active ? "Desativar" : "Ativar"}
                >
                  {sec.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditing(sec)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-gold"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir a seção "${sec.title}"?`)) del.mutate(sec.id);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-destructive hover:text-destructive"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              Nenhuma seção sazonal cadastrada.
            </p>
          )}
        </div>
      )}

      {(editing || creating) && (
        <SectionForm
          item={editing}
          nextOrder={list.length}
          categories={(categories.data ?? []).map((c) => c.name)}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function SectionForm({
  item,
  nextOrder,
  categories,
  onClose,
}: {
  item: HomeSection | null;
  nextOrder: number;
  categories: string[];
  onClose: () => void;
}) {
  const save = useSaveSection();
  const [emoji, setEmoji] = useState(item?.emoji ?? "🎁");
  const [title, setTitle] = useState(item?.title ?? "");
  const [subtitle, setSubtitle] = useState(item?.subtitle ?? "");
  const [categoryFilter, setCategoryFilter] = useState(item?.categoryFilter ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(item?.active ?? true);

  async function submit() {
    if (!title.trim()) return;
    await save.mutateAsync({
      id: item?.id,
      key: item?.key ?? "sazonal",
      emoji: emoji.trim() || null,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      categoryFilter: categoryFilter || null,
      sortOrder: Number(sortOrder) || 0,
      active,
    });
    onClose();
  }

  return (
    <Modal title={item ? "Editar seção" : "Nova seção sazonal"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
        <div>
          <label className="text-sm font-semibold">Emoji</label>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-semibold">Título *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Presentes para o Dia dos Pais"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Subtítulo</label>
        <textarea
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          rows={2}
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Produtos da seção</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={inputCls}
        >
          <option value="">Produtos em destaque</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Ordem</label>
        <input
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          inputMode="numeric"
          className={inputCls}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Visível no site
      </label>

      <div className="mt-6 flex gap-2">
        <button
          onClick={submit}
          disabled={save.isPending || !title.trim()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
        <button
          onClick={onClose}
          className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

// ============================ FOTOGRAVAÇÃO (ETAPAS) ============================
export function PhotoStepsTab() {
  const steps = useAdminPhotoSteps(true);
  const save = useSavePhotoStep();
  const del = useDeletePhotoStep();
  const [editing, setEditing] = useState<PhotoStepDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const list = steps.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">
            Fotogravação <span className="text-muted-foreground">({list.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fotos da seção "Veja como uma fotografia vira uma gravação" na página inicial.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Nova etapa
        </button>
      </div>

      {steps.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <img src={item.url} alt={item.label} className="aspect-square w-full object-cover" />
              <div className="p-3">
                <p className="truncate text-sm font-semibold">{item.label}</p>
                {item.text && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {item.text}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ordem: {item.sortOrder} {item.active ? "" : "• inativo"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => save.mutate({ id: item.id, active: !item.active })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-gold"
                    aria-label={item.active ? "Desativar" : "Ativar"}
                  >
                    {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setEditing(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-gold"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir a etapa "${item.label}"?`)) del.mutate(item.id);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-destructive hover:text-destructive"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground sm:col-span-2 lg:col-span-4">
              Nenhuma etapa cadastrada ainda.
            </p>
          )}
        </div>
      )}

      {(editing || creating) && (
        <PhotoStepForm
          item={editing}
          nextOrder={list.length}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function PhotoStepForm({
  item,
  nextOrder,
  onClose,
}: {
  item: PhotoStepDTO | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const save = useSavePhotoStep();
  const [image, setImage] = useState<string | null>(item?.imageKey ?? null);
  const [preview, setPreview] = useState<string | null>(item?.url ?? null);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState(item?.label ?? "");
  const [text, setText] = useState(item?.text ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? nextOrder));
  const [active, setActive] = useState(item?.active ?? true);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const { key, url } = await uploadFileReturnKey(file);
      setImage(key);
      setPreview(url);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!image || !label.trim()) return;
    await save.mutateAsync({
      id: item?.id,
      image,
      label: label.trim(),
      text: text.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      active,
    });
    onClose();
  }

  return (
    <Modal title={item ? "Editar etapa" : "Nova etapa da fotogravação"} onClose={onClose}>
      <label className="block cursor-pointer">
        <span className="text-sm font-semibold">Imagem *</span>
        <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
          {preview ? (
            <img src={preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {preview ? "Trocar imagem" : "Enviar imagem"}
          </span>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      <div className="mt-4">
        <label className="text-sm font-semibold">Título da etapa *</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex.: 1. Foto original"
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Descrição</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Ex.: Você envia a foto pelo WhatsApp."
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold">Ordem</label>
        <input
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          inputMode="numeric"
          className={inputCls}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Visível no site
      </label>

      <div className="mt-6 flex gap-2">
        <button
          onClick={submit}
          disabled={save.isPending || uploading || !image || !label.trim()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
        <button
          onClick={onClose}
          className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
