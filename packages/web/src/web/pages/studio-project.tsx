import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Download,
  FileJson,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { StudioShell, StudioCard, BetaNotice } from "../components/studio-shell";
import { StudioWorkbench } from "../components/studio-workbench";
import {
  useAddStudioImage,
  useCreateStudioProject,
  useDeleteStudioImage,
  useStudioGenerate,
  useStudioMe,
  useStudioOptions,
  useStudioProject,
  useUpdateStudioProject,
} from "../queries/studio";
import { getStudioToken } from "../lib/api";
import {
  downloadProjectFile,
  errMsg,
  exportDpi,
  exportProjectPng,
  mmToPx,
  STUDIO_STATUSES,
  uploadStudioFile,
} from "../lib/studio";

type Form = {
  name: string;
  clientName: string;
  product: string;
  productModel: string;
  productColor: string;
  widthMm: number;
  heightMm: number;
  engravingType: "frontal" | "lateral" | "360";
  notes: string;
  status: (typeof STUDIO_STATUSES)[number];
};

const EMPTY: Form = {
  name: "",
  clientName: "",
  product: "",
  productModel: "",
  productColor: "",
  widthMm: 290,
  heightMm: 125,
  engravingType: "frontal",
  notes: "",
  status: "Em criação",
};

const field =
  "mt-1.5 w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#C9A24B]/70";
const label = "text-xs font-semibold tracking-wide text-white/55 uppercase";

function ProjectView({ id }: { id: number | null }) {
  const [, navigate] = useLocation();
  const hasToken = Boolean(getStudioToken());
  const me = useStudioMe(hasToken);
  const options = useStudioOptions(hasToken);
  const project = useStudioProject(id);

  const create = useCreateStudioProject();
  const update = useUpdateStudioProject();
  const addImage = useAddStudioImage();
  const deleteImage = useDeleteStudioImage(id);
  const generate = useStudioGenerate();

  const [form, setForm] = useState<Form>(EMPTY);
  const [selected, setSelected] = useState<number[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDetails, setShowDetails] = useState(id == null);
  const [busyStyle, setBusyStyle] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isOwner = me.data?.role === "owner";
  const images = project.data?.images ?? [];
  const styles = options.data?.styles ?? [];
  const productList = options.data?.products ?? [];
  const modelOptions =
    productList.find((p) => p.name === form.product)?.models?.split(",").map((m) => m.trim()) ?? [];

  // Carrega o projeto salvo no formulário
  useEffect(() => {
    const p = project.data;
    if (!p) return;
    setForm({
      name: p.name,
      clientName: p.clientName ?? "",
      product: p.product ?? "",
      productModel: p.productModel ?? "",
      productColor: p.productColor ?? "",
      widthMm: p.widthMm,
      heightMm: p.heightMm,
      engravingType: p.engravingType as Form["engravingType"],
      notes: p.notes ?? "",
      status: p.status as Form["status"],
    });
  }, [project.data]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setMsg(null);
    if (!form.name.trim()) {
      setMsg({ kind: "err", text: "Dê um nome ao projeto." });
      return;
    }
    try {
      if (id == null) {
        const created = await create.mutateAsync({ ...form, name: form.name.trim() });
        navigate(`/rafa/projeto/${created.id}`, { replace: true });
      } else {
        await update.mutateAsync({ id, ...form, name: form.name.trim() });
        setMsg({ kind: "ok", text: "Projeto salvo." });
      }
    } catch (e) {
      setMsg({ kind: "err", text: errMsg(e) });
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (id == null) {
      setMsg({ kind: "err", text: "Salve o projeto antes de enviar imagens." });
      return;
    }
    setMsg(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
          setMsg({ kind: "err", text: `"${file.name}" não é PNG, JPG ou WEBP.` });
          continue;
        }
        const key = await uploadStudioFile(file);
        await addImage.mutateAsync({ projectId: id, key });
      }
    } catch (e) {
      setMsg({ kind: "err", text: errMsg(e, "Falha no envio da imagem.") });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggle(imgId: number) {
    setSelected((s) => (s.includes(imgId) ? s.filter((x) => x !== imgId) : [...s, imgId]));
  }

  async function runStyle(slug: string, credits: number, multi: boolean, name: string) {
    if (id == null) return;
    const use = multi ? selected : selected.slice(0, 1);
    if (use.length === 0) {
      setMsg({ kind: "err", text: "Selecione a imagem que a IA deve usar." });
      return;
    }
    if (!isOwner && (me.data?.credits ?? 0) < credits) {
      setMsg({ kind: "err", text: `Créditos insuficientes. "${name}" custa ${credits}.` });
      return;
    }
    const label = isOwner ? "" : ` Serão usados ${credits} crédito(s).`;
    if (!confirm(`Aplicar "${name}" em ${use.length} imagem(ns)?${label}`)) return;

    setMsg(null);
    setBusyStyle(slug);
    try {
      await generate.mutateAsync({ projectId: id, styleSlug: slug, imageIds: use });
      setMsg({ kind: "ok", text: `${name} aplicado. Confira o resultado abaixo.` });
    } catch (e) {
      setMsg({ kind: "err", text: errMsg(e, "A IA não conseguiu gerar a arte.") });
    } finally {
      setBusyStyle(null);
    }
  }

  async function exportPng(url: string, background: "white" | "transparent") {
    setMsg(null);
    try {
      await exportProjectPng({
        imageUrl: url,
        widthMm: form.widthMm,
        heightMm: form.heightMm,
        background,
        filename: `${(form.name || "arte").replace(/[^\w-]+/g, "_")}-${form.widthMm}x${form.heightMm}mm-${background === "white" ? "fundo-branco" : "transparente"}`,
      });
    } catch (e) {
      setMsg({ kind: "err", text: errMsg(e, "Não foi possível exportar.") });
    }
  }

  const saving = create.isPending || update.isPending;
  const dpi = exportDpi(form.widthMm, form.heightMm);

  return (
    <div className="space-y-5">
      <Link
        href={id == null ? "/rafa" : "/rafa/projetos"}
        className="inline-flex items-center gap-2 text-xs font-semibold text-white/45 hover:text-white/80"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {id == null ? "Painel" : "Meus Projetos"}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {id == null ? "Novo Projeto" : form.name || "Projeto"}
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Área de gravação {form.widthMm} × {form.heightMm} mm ·{" "}
            {mmToPx(form.widthMm, dpi)} × {mmToPx(form.heightMm, dpi)} px a {dpi} DPI · mínimo 4K
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B8863B] via-[#E7CE8F] to-[#B8863B] px-5 py-2.5 text-sm font-bold text-black disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {id == null ? "Criar projeto" : "Salvar"}
        </button>
      </div>

      {msg && (
        <p
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            msg.kind === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {msg.text}
        </p>
      )}

      {options.data && !options.data.aiConfigured && isOwner && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          Integração de IA não configurada no servidor. Defina AI_GATEWAY_BASE_URL e
          AI_GATEWAY_API_KEY para liberar os estilos.
        </p>
      )}

      {/* ---------- Dados do projeto (recolhível) ---------- */}
      <StudioCard>
        <button
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="font-display text-lg font-bold">Descrição do projeto</span>
            <span className="mt-0.5 block text-xs text-white/40">
              {form.product || form.clientName
                ? `${form.clientName || "sem cliente"} · ${form.product || "sem produto"} · ${form.widthMm} × ${form.heightMm} mm`
                : "Nome, cliente, produto, medidas, status e observações"}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-bold">
            {showDetails ? (
              <>
                Fechar <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Abrir <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </span>
        </button>
        {showDetails && (
        <>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={label}>Nome do projeto</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={field}
              placeholder="Copo do João"
            />
          </div>
          <div>
            <label className={label}>Nome do cliente</label>
            <input
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              className={field}
              placeholder="João da Silva"
            />
          </div>
          <div>
            <label className={label}>Produto</label>
            <select
              value={form.product}
              onChange={(e) => {
                set("product", e.target.value);
                set("productModel", "");
              }}
              className={field}
            >
              <option value="">Selecione</option>
              {productList.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Modelo</label>
            {modelOptions.length > 0 ? (
              <select
                value={form.productModel}
                onChange={(e) => set("productModel", e.target.value)}
                className={field}
              >
                <option value="">Selecione</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.productModel}
                onChange={(e) => set("productModel", e.target.value)}
                className={field}
                placeholder="500ml"
              />
            )}
          </div>
          <div>
            <label className={label}>Cor do produto</label>
            <input
              value={form.productColor}
              onChange={(e) => set("productColor", e.target.value)}
              className={field}
              placeholder="Preto"
            />
          </div>
          <div>
            <label className={label}>Tipo de gravação</label>
            <select
              value={form.engravingType}
              onChange={(e) => set("engravingType", e.target.value as Form["engravingType"])}
              className={field}
            >
              <option value="frontal">Frontal</option>
              <option value="lateral">Lateral</option>
              <option value="360">360°</option>
            </select>
          </div>
          <div>
            <label className={label}>Largura (mm)</label>
            <input
              type="number"
              min={1}
              value={form.widthMm}
              onChange={(e) => set("widthMm", Number(e.target.value) || 0)}
              className={field}
            />
          </div>
          <div>
            <label className={label}>Altura (mm)</label>
            <input
              type="number"
              min={1}
              value={form.heightMm}
              onChange={(e) => set("heightMm", Number(e.target.value) || 0)}
              className={field}
            />
          </div>
          <div>
            <label className={label}>Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as Form["status"])}
              className={field}
            >
              {STUDIO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className={label}>Medidas rápidas</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(options.data?.sizes ?? []).map((s) => {
              const active = form.widthMm === s.widthMm && form.heightMm === s.heightMm;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    set("widthMm", s.widthMm);
                    set("heightMm", s.heightMm);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-[#C9A24B] bg-[#C9A24B] text-black"
                      : "border-white/12 bg-white/5 text-white/65 hover:border-[#C9A24B]/50"
                  }`}
                >
                  {s.widthMm} × {s.heightMm} mm
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <label className={label}>Observações</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className={field}
            placeholder="Detalhes de posicionamento, prazo, referências…"
          />
        </div>
        </>
        )}
      </StudioCard>

      {/* ---------- Imagens, caixa de comando e estilos ---------- */}
      {id == null ? (
        <StudioCard>
          <p className="text-sm text-white/45">
            Salve o projeto acima para enviar imagens e usar a caixa de comando da IA.
          </p>
        </StudioCard>
      ) : (
        <StudioWorkbench
          projectId={id}
          projectName={form.name || "arte"}
          widthMm={form.widthMm}
          heightMm={form.heightMm}
          images={images}
          styles={styles}
          isOwner={Boolean(isOwner)}
          credits={me.data?.credits ?? 0}
          aiConfigured={options.data?.aiConfigured ?? true}
          customCommandCredits={options.data?.customCommandCredits ?? 2}
        />
      )}

      {/* ---------- Exportação ---------- */}
      {id != null && (
        <StudioCard>
          <h2 className="font-display text-lg font-bold">Exportação</h2>
          <p className="mt-0.5 text-xs text-white/40">
            Cada imagem tem botões de PNG com fundo branco e transparente, em 4K (lado maior ≥ 3840
            px) e na mesma proporção da foto enviada — sem recorte nem barras. Referência da peça:{" "}
            {mmToPx(form.widthMm, dpi)} × {mmToPx(form.heightMm, dpi)} px a {dpi} DPI.
          </p>
          <button
            onClick={() =>
              downloadProjectFile(
                { ...form, id, images: images.map((i) => ({ id: i.id, kind: i.kind })) },
                (form.name || "projeto").replace(/[^\w-]+/g, "_"),
              )
            }
            className="mt-3 flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-bold hover:border-[#C9A24B]/50"
          >
            <FileJson className="h-4 w-4" /> Baixar projeto para edição futura
          </button>
        </StudioCard>
      )}

      <BetaNotice />

      <p className="text-xs leading-relaxed text-white/30">
        Editor de imagem (recorte, texto, brilho, remover fundo) e Mockup 360° entram na próxima
        fase.
      </p>
    </div>
  );
}

/** Tela de novo projeto (/rafa/novo). */
export function StudioNewProjectPage() {
  return (
    <StudioShell>
      <ProjectView id={null} />
    </StudioShell>
  );
}

/** Tela de um projeto existente (/rafa/projeto/:id). */
function StudioProjectPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  return (
    <StudioShell>
      <ProjectView id={Number.isFinite(id) ? id : null} />
    </StudioShell>
  );
}

export default StudioProjectPage;
