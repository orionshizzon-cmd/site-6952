import { useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, Send, X } from "lucide-react";
import { BetaNotice, StudioCard, StudioShell } from "../components/studio-shell";
import { useSendStudioFeedback } from "../queries/studio";
import { errMsg, uploadStudioFile } from "../lib/studio";

const FEATURES = [
  "Login / acesso",
  "Novo projeto",
  "Upload de imagens",
  "Geração com IA",
  "Exportação de arquivo",
  "Meus Projetos",
  "Painel do proprietário",
  "Outro",
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#C9A24B]/60";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/45";

function FeedbackForm() {
  const send = useSendStudioFeedback();
  const fileRef = useRef<HTMLInputElement>(null);

  const [feature, setFeature] = useState(FEATURES[0]);
  const [problem, setProblem] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!problem.trim() && !suggestion.trim()) {
      setError("Descreva o problema encontrado ou envie uma sugestão.");
      return;
    }
    setBusy(true);
    try {
      let imageKey: string | null = null;
      if (file) imageKey = await uploadStudioFile(file);
      await send.mutateAsync({
        feature,
        problem: problem.trim() || null,
        suggestion: suggestion.trim() || null,
        imageKey,
      });
      setDone(true);
      setProblem("");
      setSuggestion("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Enviar Feedback</h1>
        <p className="mt-1 text-sm text-white/45">
          Conte o que funcionou, o que travou e o que você gostaria de ver no Studio.
        </p>
      </div>

      <BetaNotice />

      {done && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Feedback enviado. Obrigado por ajudar a melhorar o Rafa Laser Studio.</span>
        </div>
      )}

      <StudioCard>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="fb-feature">
              Função utilizada
            </label>
            <select
              id="fb-feature"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              className={inputClass}
            >
              {FEATURES.map((item) => (
                <option key={item} value={item} className="bg-[#111112]">
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="fb-problem">
              Problema encontrado
            </label>
            <textarea
              id="fb-problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={4}
              placeholder="O que deu errado, em qual tela, o que você esperava que acontecesse…"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="fb-suggestion">
              Sugestão de melhoria
            </label>
            <textarea
              id="fb-suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={4}
              placeholder="O que facilitaria o seu trabalho no dia a dia…"
              className={inputClass}
            />
          </div>

          <div>
            <span className={labelClass}>Imagem (opcional)</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
              id="fb-file"
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm">
                <span className="truncate text-white/70">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="ml-auto rounded-full p-1 text-white/45 transition-colors hover:text-red-300"
                  aria-label="Remover imagem"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="fb-file"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 bg-black/25 px-3.5 py-3 text-sm text-white/50 transition-colors hover:border-[#C9A24B]/50 hover:text-white/75"
              >
                <ImagePlus className="h-4 w-4" />
                Anexar print ou foto (PNG, JPG ou WEBP)
              </label>
            )}
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#C9A24B] px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#E7CE8F] disabled:opacity-55"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy ? "Enviando…" : "Enviar feedback"}
          </button>
        </form>
      </StudioCard>
    </div>
  );
}

export default function StudioFeedbackPage() {
  return (
    <StudioShell>
      <FeedbackForm />
    </StudioShell>
  );
}
