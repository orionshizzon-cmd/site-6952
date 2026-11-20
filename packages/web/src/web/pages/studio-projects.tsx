import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Copy, Plus, Search, Trash2 } from "lucide-react";
import { StudioShell, StudioCard } from "../components/studio-shell";
import {
  useDeleteStudioProject,
  useDuplicateStudioProject,
  useStudioProjects,
} from "../queries/studio";
import { getStudioToken } from "../lib/api";
import { STATUS_STYLES, STUDIO_STATUSES } from "../lib/studio";

function fmtDate(d: Date | string | number | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function ProjectsView() {
  const hasToken = Boolean(getStudioToken());
  const projects = useStudioProjects(hasToken);
  const duplicate = useDuplicateStudioProject();
  const remove = useDeleteStudioProject();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [product, setProduct] = useState("");
  const [from, setFrom] = useState("");

  const products = useMemo(
    () => [...new Set((projects.data ?? []).map((p) => p.product).filter(Boolean))] as string[],
    [projects.data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (projects.data ?? []).filter((p) => {
      if (term) {
        const hay = `${p.name} ${p.clientName ?? ""} ${p.product ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (status && p.status !== status) return false;
      if (product && p.product !== product) return false;
      if (from && new Date(p.updatedAt).getTime() < new Date(from).getTime()) return false;
      return true;
    });
  }, [projects.data, q, status, product, from]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Meus Projetos
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {filtered.length} de {projects.data?.length ?? 0} projetos
          </p>
        </div>
        <Link
          href="/rafa/novo"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B8863B] via-[#E7CE8F] to-[#B8863B] px-4 py-2.5 text-sm font-bold text-black"
        >
          <Plus className="h-4 w-4" /> Novo Projeto
        </Link>
      </div>

      <StudioCard>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou cliente"
              className="w-full rounded-xl border border-white/12 bg-black/40 py-2.5 pr-3 pl-9 text-sm outline-none placeholder:text-white/25 focus:border-[#C9A24B]/70"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[#C9A24B]/70"
          >
            <option value="">Todos os status</option>
            {STUDIO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[#C9A24B]/70"
          >
            <option value="">Todos os produtos</option>
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[#C9A24B]/70"
          />
        </div>
      </StudioCard>

      {projects.isLoading && <p className="text-sm text-white/45">Carregando…</p>}
      {!projects.isLoading && filtered.length === 0 && (
        <StudioCard>
          <p className="text-sm text-white/55">Nenhum projeto encontrado com esses filtros.</p>
        </StudioCard>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"
          >
            <Link href={`/rafa/projeto/${p.id}`}>
              <div className="flex h-36 items-center justify-center bg-black/40">
                {p.thumbUrl ? (
                  <img src={p.thumbUrl} alt={p.name} className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-white/25">sem imagem</span>
                )}
              </div>
            </Link>
            <div className="p-4">
              <Link href={`/rafa/projeto/${p.id}`}>
                <p className="truncate font-semibold hover:text-[#E7CE8F]">{p.name}</p>
              </Link>
              <p className="mt-0.5 truncate text-xs text-white/40">
                {p.clientName || "sem cliente"} · {p.product || "sem produto"}
              </p>
              <p className="mt-0.5 text-xs text-white/30">
                {p.widthMm}×{p.heightMm} mm · {p.imageCount} imagem(ns) · {fmtDate(p.updatedAt)}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    STATUS_STYLES[p.status] ?? STATUS_STYLES["Em criação"]
                  }`}
                >
                  {p.status}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => duplicate.mutate(p.id)}
                    aria-label="Duplicar"
                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/55 hover:text-[#E7CE8F]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir o projeto "${p.name}"?`)) remove.mutate(p.id);
                    }}
                    aria-label="Excluir"
                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/55 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudioProjectsPage() {
  return (
    <StudioShell>
      <ProjectsView />
    </StudioShell>
  );
}

export default StudioProjectsPage;
