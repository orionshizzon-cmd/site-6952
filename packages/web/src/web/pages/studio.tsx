import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Coins, FolderOpen, Loader2, MessageSquarePlus, Plus } from "lucide-react";
import { StudioShell, StudioCard, BetaNotice } from "../components/studio-shell";
import { StudioWorkbench } from "../components/studio-workbench";
import {
  useStudioMe,
  useStudioOptions,
  useStudioProjects,
  useStudioQuickProject,
  useUpdateStudioProject,
} from "../queries/studio";
import { getStudioToken } from "../lib/api";
import { STATUS_STYLES } from "../lib/studio";

function fmtDate(d: Date | string | number | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function Dashboard() {
  const hasToken = Boolean(getStudioToken());
  const me = useStudioMe(hasToken);
  const options = useStudioOptions(hasToken);
  const projects = useStudioProjects(hasToken);
  const quick = useStudioQuickProject(hasToken);
  const update = useUpdateStudioProject();

  const isOwner = me.data?.role === "owner";
  const recent = (projects.data ?? []).filter((p) => p.id !== quick.data?.id).slice(0, 6);

  // Medida de exportação da área rápida (persistida no espaço de trabalho)
  const [size, setSize] = useState({ widthMm: 290, heightMm: 125 });
  useEffect(() => {
    if (quick.data) setSize({ widthMm: quick.data.widthMm, heightMm: quick.data.heightMm });
  }, [quick.data?.id]);

  function pickSize(widthMm: number, heightMm: number) {
    setSize({ widthMm, heightMm });
    if (quick.data) update.mutate({ id: quick.data.id, widthMm, heightMm });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#C9A24B] uppercase">
            Área de trabalho
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Envie a foto e transforme
          </h1>
          <p className="mt-1.5 text-sm text-white/45">
            Não precisa criar projeto: envie a imagem, aplique um estilo e baixe pronta para gravar.
          </p>
        </div>
        <StudioCard className="min-w-40">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/45 uppercase">
            <Coins className="h-3.5 w-3.5 text-[#E7CE8F]" /> Créditos
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold">
            {isOwner ? "Ilimitado" : (me.data?.credits ?? 0)}
          </p>
          {!isOwner && (
            <p className="mt-0.5 text-xs text-white/35">
              {me.data?.creditsUsed ?? 0} já utilizados
            </p>
          )}
        </StudioCard>
      </div>

      {quick.isLoading && (
        <StudioCard>
          <p className="flex items-center gap-2 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparando sua área de trabalho…
          </p>
        </StudioCard>
      )}

      {quick.data && (
        <StudioWorkbench
          projectId={quick.data.id}
          projectName="arte"
          widthMm={size.widthMm}
          heightMm={size.heightMm}
          images={quick.data.images}
          styles={options.data?.styles ?? []}
          isOwner={Boolean(isOwner)}
          credits={me.data?.credits ?? 0}
          aiConfigured={options.data?.aiConfigured ?? true}
          customCommandCredits={options.data?.customCommandCredits ?? 2}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/rafa/novo"
          className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-[#C9A24B]/50"
        >
          <Plus className="h-4 w-4" /> Criar projeto de cliente
        </Link>
        <Link
          href="/rafa/projetos"
          className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-[#C9A24B]/50"
        >
          <FolderOpen className="h-4 w-4" /> Meus Projetos
        </Link>
        <Link
          href="/rafa/feedback"
          className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-[#C9A24B]/50"
        >
          <MessageSquarePlus className="h-4 w-4" /> Enviar Feedback
        </Link>
      </div>

      <BetaNotice />

      {recent.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold">Projetos de clientes</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <Link
                key={p.id}
                href={`/rafa/projeto/${p.id}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition-colors hover:border-[#C9A24B]/45"
              >
                <div className="flex h-32 items-center justify-center bg-black/40">
                  {p.thumbUrl ? (
                    <img
                      src={p.thumbUrl}
                      alt={p.name}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-xs text-white/25">sem imagem</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {p.clientName || "sem cliente"} · {p.widthMm}×{p.heightMm} mm
                  </p>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        STATUS_STYLES[p.status] ?? STATUS_STYLES["Em criação"]
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-[10px] text-white/30">{fmtDate(p.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StudioPage() {
  return (
    <StudioShell>
      <Dashboard />
    </StudioShell>
  );
}

export default StudioPage;
