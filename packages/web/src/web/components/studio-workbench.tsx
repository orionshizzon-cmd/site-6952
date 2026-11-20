import { useRef, useState } from "react";
import {
  Check,
  Coins,
  Download,
  Eraser,
  Terminal,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { StudioCard } from "./studio-shell";
import {
  useAddStudioImage,
  useDeleteStudioImage,
  useStudioGenerate,
} from "../queries/studio";
import { errMsg, exportProjectPng, uploadStudioFile } from "../lib/studio";

type StyleOption = {
  slug: string;
  name: string;
  description: string | null;
  credits: number;
  multiImage: boolean;
  prompt?: string | null;
};

type ImageItem = {
  id: number;
  url: string;
  kind: string;
  styleName: string | null;
  creditsUsed: number;
};

/**
 * Painel único de trabalho: envio de imagens + estilos de IA + exportação.
 * Usado tanto na área rápida (/rafa) quanto dentro de um projeto salvo.
 */
export function StudioWorkbench({
  projectId,
  projectName,
  widthMm,
  heightMm,
  images,
  styles,
  isOwner,
  credits,
  aiConfigured = true,
  customCommandCredits = 2,
}: {
  projectId: number | null;
  projectName: string;
  widthMm: number;
  heightMm: number;
  images: ImageItem[];
  styles: StyleOption[];
  isOwner: boolean;
  credits: number;
  aiConfigured?: boolean;
  customCommandCredits?: number;
}) {
  const addImage = useAddStudioImage();
  const deleteImage = useDeleteStudioImage(projectId);
  const generate = useStudioGenerate();

  const [selected, setSelected] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyStyle, setBusyStyle] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [tolerance, setTolerance] = useState(30);
  const [command, setCommand] = useState("");
  const [commandStyle, setCommandStyle] = useState<StyleOption | null>(null);
  const [runningCommand, setRunningCommand] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || projectId == null) return;
    setMsg(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
          setMsg({ kind: "err", text: `"${file.name}" não é PNG, JPG ou WEBP.` });
          continue;
        }
        const key = await uploadStudioFile(file);
        const created = await addImage.mutateAsync({ projectId, key });
        setSelected([created.id]);
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

  async function runStyle(style: StyleOption) {
    if (projectId == null) return;
    const use = style.multiImage ? selected : selected.slice(0, 1);
    if (use.length === 0) {
      setMsg({ kind: "err", text: "Envie e selecione a imagem que a IA deve usar." });
      return;
    }
    if (!isOwner && credits < style.credits) {
      setMsg({ kind: "err", text: `Créditos insuficientes. "${style.name}" custa ${style.credits}.` });
      return;
    }
    const extra = isOwner ? "" : ` Serão usados ${style.credits} crédito(s).`;
    if (!confirm(`Aplicar "${style.name}" em ${use.length} imagem(ns)?${extra}`)) return;

    setMsg(null);
    setBusyStyle(style.slug);
    try {
      await generate.mutateAsync({
        projectId,
        styleSlug: style.slug,
        customPrompt: null,
        imageIds: use,
      });
      setMsg({ kind: "ok", text: `${style.name} aplicado. O resultado aparece nas imagens acima.` });
    } catch (e) {
      setMsg({ kind: "err", text: errMsg(e, "A IA não conseguiu gerar a arte.") });
    } finally {
      setBusyStyle(null);
    }
  }

  /** Coloca o estilo na caixa de comando para o usuário completar antes de enviar. */
  function loadStyleIntoCommand(style: StyleOption) {
    setCommandStyle(style);
    setCommand(
      style.prompt
        ? style.prompt
        : `Estilo "${style.name}"${style.description ? ` — ${style.description}` : ""}.\nDetalhes extras: `,
    );
    setMsg(null);
    document.getElementById("studio-command")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /** Envia o texto da caixa de comando direto para a IA. */
  async function runCommand() {
    if (projectId == null) return;
    const text = command.trim();
    if (text.length < 5) {
      setMsg({ kind: "err", text: "Escreva o comando que a IA deve executar." });
      return;
    }
    const use = commandStyle && !commandStyle.multiImage ? selected.slice(0, 1) : selected;
    if (use.length === 0) {
      setMsg({ kind: "err", text: "Selecione a imagem que a IA deve usar." });
      return;
    }
    const cost = commandStyle ? commandStyle.credits : customCommandCredits;
    if (!isOwner && credits < cost) {
      setMsg({ kind: "err", text: `Créditos insuficientes. Este comando custa ${cost}.` });
      return;
    }

    setMsg(null);
    setRunningCommand(true);
    try {
      await generate.mutateAsync({
        projectId,
        styleSlug: commandStyle?.slug ?? null,
        customPrompt: text,
        imageIds: use,
      });
      setMsg({ kind: "ok", text: "Comando executado. O resultado aparece nas imagens acima." });
    } catch (e) {
      setMsg({ kind: "err", text: errMsg(e, "A IA não conseguiu executar o comando.") });
    } finally {
      setRunningCommand(false);
    }
  }

  async function exportPng(
    url: string,
    background: "white" | "transparent",
    removeBackground = false,
  ) {
    setMsg(null);
    try {
      const sufixo = removeBackground
        ? "sem-fundo"
        : background === "white"
          ? "fundo-branco"
          : "transparente";
      await exportProjectPng({
        imageUrl: url,
        widthMm,
        heightMm,
        background,
        removeBackground,
        tolerance,
        filename: `${(projectName || "arte").replace(/[^\w-]+/g, "_")}-${widthMm}x${heightMm}mm-${sufixo}`,
      });
    } catch (e) {
      setMsg({ kind: "err", text: errMsg(e, "Não foi possível exportar.") });
    }
  }

  return (
    <div className="space-y-5">
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

      {/* ---------- 1. Envio de imagens ---------- */}
      <StudioCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Suas imagens</h2>
            <p className="mt-0.5 text-xs text-white/40">
              PNG, JPG ou WEBP. Clique na imagem para selecioná-la antes de aplicar um estilo. A arte
            final sai em 4K com a mesma proporção da foto enviada. Use "Sem fundo" para baixar o PNG
            com o fundo apagado.
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || projectId == null}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B8863B] via-[#E7CE8F] to-[#B8863B] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Enviar imagem
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {images.length === 0 && (
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-12 transition-colors ${
              dragging ? "border-[#C9A24B] bg-[#C9A24B]/10" : "border-white/15 bg-black/25"
            }`}
          >
            <Upload className="h-6 w-6 text-[#E7CE8F]" />
            <span className="text-sm font-semibold">Arraste a foto aqui ou clique para enviar</span>
            <span className="text-xs text-white/35">
              Sem burocracia: envie a imagem e aplique os estilos logo abaixo.
            </span>
          </button>
        )}

        {images.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => {
              const on = selected.includes(img.id);
              return (
                <div
                  key={img.id}
                  className={`overflow-hidden rounded-xl border transition-colors ${
                    on ? "border-[#C9A24B]" : "border-white/10"
                  }`}
                >
                  <button
                    onClick={() => toggle(img.id)}
                    className="relative block h-36 w-full bg-black/40"
                  >
                    <img src={img.url} alt="" className="h-full w-full object-contain p-1.5" />
                    {on && (
                      <span className="absolute top-2 left-2 rounded-full bg-[#C9A24B] p-1 text-black">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {img.kind === "generated" && (
                      <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-[#E7CE8F]">
                        IA
                      </span>
                    )}
                  </button>
                  <div className="space-y-2 p-2.5">
                    <p className="truncate text-[11px] text-white/45">
                      {img.styleName ?? "Original"}
                      {img.creditsUsed > 0 && ` · ${img.creditsUsed} cr.`}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => exportPng(img.url, "white")}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:border-[#C9A24B]/50"
                      >
                        <Download className="h-3 w-3" /> Branco
                      </button>
                      <button
                        onClick={() => exportPng(img.url, "transparent")}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:border-[#C9A24B]/50"
                      >
                        <Download className="h-3 w-3" /> Transp.
                      </button>
                      <button
                        onClick={() => exportPng(img.url, "transparent", true)}
                        title="Apaga o fundo da foto e baixa o PNG recortado"
                        className="flex items-center gap-1 rounded-lg border border-[#C9A24B]/40 bg-[#C9A24B]/10 px-2 py-1 text-[10px] font-semibold text-[#E7CE8F] hover:border-[#C9A24B]"
                      >
                        <Eraser className="h-3 w-3" /> Sem fundo
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Excluir esta imagem?")) deleteImage.mutate(img.id);
                        }}
                        aria-label="Excluir imagem"
                        className="rounded-lg border border-white/10 bg-white/5 p-1 text-white/50 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-5 border-t border-white/8 pt-4">
            <label
              htmlFor="tol-fundo"
              className="text-xs font-semibold tracking-wide text-white/45 uppercase"
            >
              Sensibilidade da remoção de fundo
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="tol-fundo"
                type="range"
                min={5}
                max={70}
                step={1}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="h-1.5 w-full max-w-xs accent-[#C9A24B]"
              />
              <span className="w-8 text-xs font-bold text-[#E7CE8F]">{tolerance}</span>
            </div>
            <p className="mt-2 text-[11px] text-white/35">
              Valor baixo apaga só cores bem parecidas com a do fundo; valor alto apaga mais, mas
              pode comer partes da arte. Ajuste e clique de novo em "Sem fundo".
            </p>
          </div>
        )}

      </StudioCard>

      {/* ---------- 2. Caixa de comando ---------- */}
      <StudioCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Terminal className="h-4 w-4 text-[#E7CE8F]" /> Caixa de comando
            </h2>
            <p className="mt-0.5 text-xs text-white/40">
              Escreva com suas palavras o que a IA deve fazer com a imagem selecionada. Você também
              pode clicar em "Editar na caixa de comando" em qualquer estilo abaixo e completar com
              mais detalhes antes de enviar.
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#C9A24B]/35 bg-[#C9A24B]/10 px-2.5 py-1 text-[10px] font-bold text-[#E7CE8F]">
            <Coins className="h-3 w-3" />
            {isOwner
              ? "Ilimitado"
              : `${commandStyle ? commandStyle.credits : customCommandCredits} cr.`}
          </span>
        </div>

        {commandStyle && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-[#C9A24B]/40 bg-[#C9A24B]/10 px-2.5 py-1 font-semibold text-[#E7CE8F]">
              Base: {commandStyle.name}
            </span>
            <button
              onClick={() => {
                setCommandStyle(null);
                setCommand("");
              }}
              className="text-white/45 underline hover:text-white/70"
            >
              limpar
            </button>
          </div>
        )}

        <textarea
          id="studio-command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          rows={6}
          placeholder={
            'Ex.: "Transforme a foto em pontilhismo em preto e branco, alto contraste, fundo branco, mantendo o rosto nítido e sem sombras suaves."'
          }
          className="mt-3 w-full resize-y rounded-xl border border-white/12 bg-black/35 px-3.5 py-3 text-sm leading-relaxed outline-none placeholder:text-white/25 focus:border-[#C9A24B]/60"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={runCommand}
            disabled={runningCommand || busyStyle !== null || projectId == null}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B8863B] via-[#E7CE8F] to-[#B8863B] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            {runningCommand ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Enviar comando
          </button>
          <span className="text-[11px] text-white/35">
            {selected.length === 0
              ? "Selecione uma imagem acima antes de enviar."
              : `${selected.length} imagem(ns) selecionada(s).`}
          </span>
        </div>

        {!isOwner && commandStyle && (
          <p className="mt-3 text-[11px] text-white/30">
            O estilo escolhido já tem a receita pronta no servidor. O que você escrever aqui entra
            como ajuste extra por cima dela.
          </p>
        )}
      </StudioCard>

      {/* ---------- 3. Estilos de IA ---------- */}
      <StudioCard>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Sparkles className="h-4 w-4 text-[#E7CE8F]" /> Transformar com IA
        </h2>
        <p className="mt-0.5 text-xs text-white/40">
          Selecione a imagem acima e escolha o estilo. O custo aparece em cada botão e só é debitado
          quando a arte é gerada.
        </p>

        {!aiConfigured && isOwner && (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
            Integração de IA não configurada no servidor. Defina AI_GATEWAY_BASE_URL e
            AI_GATEWAY_API_KEY para liberar os estilos.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {styles.map((s) => (
            <div key={s.slug} className="rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{s.name}</p>
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#C9A24B]/35 bg-[#C9A24B]/10 px-2 py-0.5 text-[10px] font-bold text-[#E7CE8F]">
                  <Coins className="h-3 w-3" /> {s.credits}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/40">{s.description}</p>
              <p className="mt-1.5 text-[10px] text-white/30">
                {s.multiImage ? "Usa todas as imagens selecionadas" : "Uma imagem por vez"}
              </p>
              <button
                onClick={() => runStyle(s)}
                disabled={busyStyle !== null || projectId == null}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold transition-colors hover:bg-[#C9A24B] hover:text-black disabled:opacity-50"
              >
                {busyStyle === s.slug ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                Aplicar ({s.credits} cr.)
              </button>
              <button
                onClick={() => loadStyleIntoCommand(s)}
                disabled={projectId == null}
                className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/60 transition-colors hover:border-[#C9A24B]/60 hover:text-[#E7CE8F] disabled:opacity-50"
              >
                <Terminal className="h-3 w-3" /> Editar na caixa de comando
              </button>
            </div>
          ))}
          {styles.length === 0 && (
            <p className="text-sm text-white/45">Nenhum estilo cadastrado ainda.</p>
          )}
        </div>
      </StudioCard>
    </div>
  );
}
