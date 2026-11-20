import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import type { ImportedListingDTO } from "../../api/database/schema";
import { uploadFileReturnKey } from "../lib/upload";
import { formatBRL, parseToCents, centsToInput } from "../lib/money";
import { useCategories } from "../queries/categories";
import {
  useAddListingImage,
  useApproveListing,
  useImportListingUrl,
  useImportedListings,
  useRemoveListing,
  useRemoveListingImage,
  useRewriteListing,
  useUpdateListingDraft,
} from "../queries/listing-import";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold";

const STATUS_LABEL: Record<string, string> = {
  revisao: "Aguardando conferência",
  aprovado: "Aprovado",
  erro: "Falhou",
};

// ---------------- Conferência do anúncio copiado ----------------
function ReviewCard({ listing }: { listing: ImportedListingDTO }) {
  const [name, setName] = useState(listing.name);
  const [shortDescription, setShortDescription] = useState(listing.shortDescription);
  const [description, setDescription] = useState(listing.description);
  const [category, setCategory] = useState(listing.category ?? "");
  const [brand, setBrand] = useState(listing.brand ?? "");
  const [price, setPrice] = useState(centsToInput(listing.price));
  const [specs, setSpecs] = useState(listing.specs ?? "");
  const [colorsText, setColorsText] = useState(listing.colorsText ?? "");
  const [model, setModel] = useState(listing.model ?? "");
  const [variationsText, setVariationsText] = useState(listing.variationsText ?? "");
  const [showLog, setShowLog] = useState(false);
  const [active, setActive] = useState(true);
  const [customizable, setCustomizable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [stock, setStock] = useState(listing.sourceStock != null ? String(listing.sourceStock) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = useCategories();
  const update = useUpdateListingDraft();
  const addImage = useAddListingImage();
  const removeImage = useRemoveListingImage();
  const approve = useApproveListing();
  const rewrite = useRewriteListing();
  const remove = useRemoveListing();

  // Quando o rascunho muda no servidor (fotos), sincroniza os campos base
  useEffect(() => {
    setName(listing.name);
    setShortDescription(listing.shortDescription);
    setDescription(listing.description);
    setSpecs(listing.specs ?? "");
  }, [listing.id, listing.name, listing.shortDescription, listing.description, listing.specs]);

  const approved = listing.status === "aprovado";

  function draftPayload() {
    return {
      id: listing.id,
      name: name.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      category: category.trim() || null,
      brand: brand.trim() || null,
      price: parseToCents(price),
      specs: specs.trim() || null,
      colorsText: colorsText.trim() || null,
      model: model.trim() || null,
      variationsText: variationsText.trim() || null,
    };
  }

  async function onRewrite() {
    setError(null);
    setMessage(null);
    try {
      // salva o que está na tela para a IA usar os dados conferidos
      await update.mutateAsync(draftPayload());
      await rewrite.mutateAsync(listing.id);
      setMessage("Anúncio reescrito no padrão Rafa Laser. Confira o texto antes de aprovar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o anúncio.");
    }
  }

  async function save() {
    setError(null);
    setMessage(null);
    try {
      await update.mutateAsync(draftPayload());
      setMessage("Alterações salvas no rascunho.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function toggleSelected(index: number) {
    const images = listing.images.map((img, i) => ({
      key: img.key,
      source: img.source,
      selected: i === index ? !img.selected : img.selected,
    }));
    await update.mutateAsync({ id: listing.id, images });
  }

  async function setCover(index: number) {
    const images = listing.images.map((img, i) => ({
      key: img.key,
      source: img.source,
      selected: i === index ? true : img.selected,
    }));
    await update.mutateAsync({ id: listing.id, images, coverIndex: index });
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const { key } = await uploadFileReturnKey(file);
        await addImage.mutateAsync({ id: listing.id, key });
      }
    } catch {
      setError("Falha ao enviar a foto.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onApprove() {
    setError(null);
    setMessage(null);
    if (!name.trim()) {
      setError("O nome do produto é obrigatório.");
      return;
    }
    try {
      // Salva o que está na tela antes de cadastrar
      await update.mutateAsync(draftPayload());
      const res = await approve.mutateAsync({
        id: listing.id,
        active,
        customizable,
        featured,
        stock: stock.trim() === "" ? null : Math.max(0, Number(stock) || 0),
      });
      setMessage(
        `Produto cadastrado com sucesso (/${res.slug}). ${
          active ? "Já está visível no site." : "Está oculto — ative na aba Produtos quando quiser."
        }`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível aprovar.");
    }
  }

  const selectedCount = listing.images.filter((i) => i.selected).length;
  const busy =
    update.isPending ||
    approve.isPending ||
    addImage.isPending ||
    removeImage.isPending ||
    rewrite.isPending;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                approved
                  ? "bg-emerald-500/15 text-emerald-400"
                  : listing.status === "erro"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-gold/15 text-gold"
              }`}
            >
              {STATUS_LABEL[listing.status] ?? listing.status}
            </span>
            {listing.store ? (
              <span className="text-xs text-muted-foreground">
                Origem: {listing.store}
                {listing.itemId ? ` · ${listing.itemId}` : ""}
                {listing.marketplace ? " · API oficial" : ""}
              </span>
            ) : null}
            <a
              href={listing.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> abrir anúncio
            </a>
          </div>
          <p className="mt-2 truncate font-display text-lg font-bold">{listing.name || "Sem nome"}</p>
        </div>
        <button
          onClick={() => {
            if (confirm("Descartar este rascunho?")) remove.mutate(listing.id);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Descartar
        </button>
      </div>

      {listing.error ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {listing.error}
        </p>
      ) : null}

      {listing.warnings.length ? (
        <ul className="mt-3 space-y-1 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-300">
          {listing.warnings.map((w, i) => (
            <li key={i}>⚠️ {w}</li>
          ))}
        </ul>
      ) : null}

      {listing.status !== "erro" ? (
        <>
          {/* ---------- Fotos ---------- */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">
                Fotos copiadas{" "}
                <span className="font-normal text-muted-foreground">
                  ({selectedCount} de {listing.images.length} selecionadas)
                </span>
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files)}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || approved}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  Adicionar foto
                </button>
              </div>
            </div>

            {listing.images.length ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {listing.images.map((img, i) => (
                  <div
                    key={img.key}
                    className={`group relative overflow-hidden rounded-xl border-2 ${
                      i === listing.coverIndex
                        ? "border-gold"
                        : img.selected
                          ? "border-emerald-500/60"
                          : "border-border opacity-50"
                    }`}
                  >
                    <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                    {i === listing.coverIndex ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-background">
                        CAPA
                      </span>
                    ) : null}
                    {!approved ? (
                      <div className="absolute inset-x-0 bottom-0 flex divide-x divide-border/40 bg-background/85 text-[11px] font-semibold">
                        <button
                          onClick={() => toggleSelected(i)}
                          className="flex-1 py-1.5 hover:text-gold"
                          title={img.selected ? "Não usar esta foto" : "Usar esta foto"}
                        >
                          {img.selected ? (
                            <Check className="mx-auto h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <X className="mx-auto h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setCover(i)}
                          className="flex-1 py-1.5 hover:text-gold"
                          title="Usar como capa"
                        >
                          <Star className="mx-auto h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeImage.mutate({ id: listing.id, index: i })}
                          className="flex-1 py-1.5 hover:text-destructive"
                          title="Apagar foto"
                        >
                          <Trash2 className="mx-auto h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Nenhuma foto foi baixada do anúncio. Envie as fotos manualmente.
              </p>
            )}
          </div>

          {/* ---------- Campos ---------- */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Nome do produto</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={approved}
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Descrição curta (aparece no card do site)
              </label>
              <input
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                disabled={approved}
                maxLength={160}
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Descrição completa</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={approved}
                rows={6}
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Ficha técnica (uma linha por informação)
              </label>
              <textarea
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                disabled={approved}
                rows={4}
                className={inputCls}
                placeholder="Material: aço inox&#10;Capacidade: 500 ml"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Categoria</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={approved}
                list={`cats-${listing.id}`}
                className={inputCls}
                placeholder="Ex.: Canecas"
              />
              <datalist id={`cats-${listing.id}`}>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Marca</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                disabled={approved}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Modelo</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={approved}
                className={inputCls}
                placeholder="Modelo informado no anúncio"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Preço de venda no seu site (R$)
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={approved}
                className={inputCls}
                placeholder="0,00"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Preço encontrado no anúncio: {formatBRL(listing.price)}
                {listing.originalPrice ? ` (de ${formatBRL(listing.originalPrice)})` : ""}. Deixe vazio
                para "Sob consulta".
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Cores (separadas por vírgula)
              </label>
              <input
                value={colorsText}
                onChange={(e) => setColorsText(e.target.value)}
                disabled={approved}
                className={inputCls}
                placeholder="Preto, Branco"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Estoque (vazio = sob encomenda)
              </label>
              <input
                value={stock}
                onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                disabled={approved}
                className={inputCls}
                placeholder="Ex.: 10"
              />
              {listing.sourceStock != null ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Estoque no anúncio de origem: {listing.sourceStock}
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Variações do anúncio de origem (uma por linha)
              </label>
              <textarea
                value={variationsText}
                onChange={(e) => setVariationsText(e.target.value)}
                disabled={approved}
                rows={3}
                className={inputCls}
                placeholder="Cor: Preto (12 disponíveis)"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Link original</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-gold hover:underline"
                >
                  {listing.url}
                </a>
                <button
                  onClick={() => navigator.clipboard?.writeText(listing.url)}
                  className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground hover:text-gold"
                >
                  copiar
                </button>
              </div>
              {listing.seller ? (
                <p className="mt-1 text-[11px] text-muted-foreground">Vendedor de origem: {listing.seller}</p>
              ) : null}
            </div>
          </div>

          {!approved ? (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Publicar visível no site
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customizable}
                  onChange={(e) => setCustomizable(e.target.checked)}
                />
                Aceita personalização a laser
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                Destacar na home
              </label>
            </div>
          ) : null}

          {message ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          ) : null}

          {!approved ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={onApprove}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-background disabled:opacity-60"
              >
                {approve.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                ✅ Aprovar e cadastrar produto
              </button>
              <button
                onClick={onRewrite}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-gold/60 px-5 py-2.5 text-sm font-semibold text-gold disabled:opacity-60"
              >
                {rewrite.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                ✨ Gerar anúncio Rafa Laser
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar rascunho
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-emerald-400">
              Produto já cadastrado no catálogo (ID {listing.productId}). Ajustes agora são feitos na aba
              Produtos.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

// ---------------- Aba principal ----------------
export function ImportListingTab() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showApproved, setShowApproved] = useState(false);

  const listings = useImportedListings(true);
  const importUrl = useImportListingUrl();

  async function onImport() {
    const value = url.trim();
    setError(null);
    if (!/^https?:\/\//i.test(value)) {
      setError("Cole o link completo do anúncio, começando com https://");
      return;
    }
    try {
      const res = await importUrl.mutateAsync(value);
      if (!res.ok) setError(res.error ?? "Não foi possível copiar este anúncio.");
      else setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao copiar o anúncio.");
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      setError("Seu navegador não liberou a área de transferência. Cole o link com Ctrl+V.");
    }
  }

  const rows = listings.data ?? [];
  const pending = rows.filter((r) => r.status !== "aprovado");
  const done = rows.filter((r) => r.status === "aprovado");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-gold" />
          <h2 className="font-display text-xl font-bold">Importar anúncio da internet</h2>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Cole o link de um anúncio (Mercado Livre, Shopee, Amazon, site de fornecedor...). A IA lê a
          página, copia as fotos, o nome, a descrição, a ficha técnica e o preço. Você confere, corrige o
          que quiser e aprova — só então o produto entra no seu catálogo.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onImport();
            }}
            placeholder="https://..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
          <button
            onClick={pasteFromClipboard}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"
          >
            <ClipboardPaste className="h-4 w-4" /> Colar
          </button>
          <button
            onClick={onImport}
            disabled={importUrl.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-background disabled:opacity-60"
          >
            {importUrl.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            📥 Copiar anúncio
          </button>
        </div>

        {importUrl.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Lendo a página e baixando as fotos… isso leva de 10 a 40 segundos.
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        ) : null}
      </div>

      {listings.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {pending.length ? (
        <div className="space-y-5">
          <h3 className="font-display text-lg font-bold">
            Conferir e aprovar{" "}
            <span className="text-sm font-normal text-muted-foreground">({pending.length})</span>
          </h3>
          {pending.map((l) => (
            <ReviewCard key={l.id} listing={l} />
          ))}
        </div>
      ) : !listings.isLoading ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum anúncio copiado ainda. Cole um link acima para começar.
        </p>
      ) : null}

      {done.length ? (
        <div className="space-y-4">
          <button
            onClick={() => setShowApproved((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {showApproved ? "Esconder" : "Ver"} anúncios já aprovados ({done.length})
          </button>
          {showApproved ? done.map((l) => <ReviewCard key={l.id} listing={l} />) : null}
        </div>
      ) : null}
    </div>
  );
}
