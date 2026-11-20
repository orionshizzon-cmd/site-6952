import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  BarChart3,
  Box,
  Coins,
  Loader2,
  MessageSquare,
  Plus,
  Ruler,
  Save,
  Shapes,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { StudioCard, StudioShell } from "../components/studio-shell";
import { errMsg, uploadStudioFile } from "../lib/studio";
import {
  useDeleteStudioFeedback,
  useDeleteStudioMockup,
  useDeleteStudioProduct,
  useDeleteStudioSize,
  useDeleteStudioStyle,
  useDeleteStudioUser,
  useSaveStudioMockup,
  useSaveStudioProduct,
  useSaveStudioSize,
  useSaveStudioStyle,
  useSaveStudioUser,
  useStudioAllProjects,
  useStudioFeedbacks,
  useStudioMockups,
  useStudioOptions,
  useStudioReport,
  useStudioStyles,
  useStudioUsers,
} from "../queries/studio";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#C9A24B]/60";
const fieldLabel = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/40";
const goldBtn =
  "inline-flex items-center gap-1.5 rounded-full bg-[#C9A24B] px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-[#E7CE8F] disabled:opacity-55";
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/65 transition-colors hover:border-white/25 hover:text-white";

const TABS = [
  { id: "usuarios", label: "Usuários Beta", icon: Users },
  { id: "projetos", label: "Projetos", icon: Shapes },
  { id: "prompts", label: "Prompts de IA", icon: Sparkles },
  { id: "catalogo", label: "Medidas e Produtos", icon: Ruler },
  { id: "mockups", label: "Mockups", icon: Box },
  { id: "feedbacks", label: "Feedbacks", icon: MessageSquare },
  { id: "relatorio", label: "Relatório", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <StudioCard>
      <h2 className="font-display text-base font-bold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
      <div className="mt-4">{children}</div>
    </StudioCard>
  );
}

function ErrorLine({ value }: { value: string | null }) {
  if (!value) return null;
  return <p className="mt-2 text-xs text-red-300">{value}</p>;
}

/* ============================ Usuários Beta ============================ */
function UsersTab() {
  const users = useStudioUsers(true);
  const save = useSaveStudioUser();
  const remove = useDeleteStudioUser();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", credits: 20 });

  const betaCount = (users.data ?? []).filter((u) => u.role === "beta").length;

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({ ...form });
      setForm({ name: "", email: "", password: "", credits: 20 });
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function patch(id: number, data: Record<string, unknown>) {
    setError(null);
    try {
      await save.mutateAsync({ id, ...data });
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="space-y-5">
      <Section
        title="Criar acesso beta"
        hint={`Não existe cadastro público: só você cria acessos. ${betaCount} de 5 usuários beta em uso.`}
      >
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <label className={fieldLabel} htmlFor="nu-name">
              Nome
            </label>
            <input
              id="nu-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div className="lg:col-span-2">
            <label className={fieldLabel} htmlFor="nu-email">
              E-mail
            </label>
            <input
              id="nu-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="nu-pass">
              Senha
            </label>
            <input
              id="nu-pass"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={4}
              className={inputClass}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="nu-credits">
              Créditos
            </label>
            <div className="flex gap-2">
              <input
                id="nu-credits"
                type="number"
                min={0}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                className={inputClass}
              />
              <button type="submit" disabled={save.isPending || betaCount >= 5} className={goldBtn}>
                {save.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </form>
        <ErrorLine value={error} />
      </Section>

      <Section title="Acessos" hint="Ajuste créditos, bloqueie ou remova acessos a qualquer momento.">
        {users.isLoading && <p className="text-sm text-white/45">Carregando…</p>}
        <div className="space-y-3">
          {(users.data ?? []).map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
            >
              <div className="min-w-40 flex-1">
                <p className="text-sm font-semibold">
                  {user.name}
                  {user.role === "owner" && (
                    <span className="ml-2 rounded-full border border-[#C9A24B]/35 bg-[#C9A24B]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#E7CE8F]">
                      PROPRIETÁRIO
                    </span>
                  )}
                  {user.blocked && (
                    <span className="ml-2 rounded-full border border-red-400/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
                      BLOQUEADO
                    </span>
                  )}
                </p>
                <p className="text-xs text-white/40">{user.email}</p>
                <p className="mt-0.5 text-[11px] text-white/35">
                  {user.projectCount} projeto(s) ·{" "}
                  {user.lastLoginAt
                    ? `último acesso ${new Date(user.lastLoginAt).toLocaleString("pt-BR")}`
                    : "nunca acessou"}
                </p>
              </div>

              {user.role === "owner" ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#E7CE8F]">
                  <Coins className="h-3.5 w-3.5" /> Ilimitado
                </span>
              ) : (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-white/45">
                    <Coins className="h-3.5 w-3.5 text-[#E7CE8F]" />
                    <input
                      type="number"
                      min={0}
                      defaultValue={user.credits}
                      onBlur={(e) => {
                        const credits = Number(e.target.value);
                        if (credits !== user.credits) patch(user.id, { credits });
                      }}
                      className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-[#C9A24B]/60"
                    />
                  </label>
                  <button
                    onClick={() => patch(user.id, { blocked: !user.blocked })}
                    className={ghostBtn}
                  >
                    {user.blocked ? "Reativar" : "Bloquear"}
                  </button>
                  <button
                    onClick={() => {
                      const password = window.prompt(`Nova senha para ${user.name}:`);
                      if (password && password.length >= 4) patch(user.id, { password });
                    }}
                    className={ghostBtn}
                  >
                    Trocar senha
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Excluir o acesso de ${user.name} e os projetos dele?`))
                        remove.mutate(user.id);
                    }}
                    className="rounded-full border border-white/12 bg-white/5 p-2 text-white/50 transition-colors hover:border-red-400/40 hover:text-red-300"
                    aria-label="Excluir usuário"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ============================ Projetos ============================ */
function ProjectsTab() {
  const projects = useStudioAllProjects(true);
  const [term, setTerm] = useState("");

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    const list = projects.data ?? [];
    if (!q) return list;
    return list.filter((p) =>
      [p.name, p.clientName, p.product, p.userName, p.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [projects.data, term]);

  return (
    <Section title="Projetos de todos os usuários" hint={`${rows.length} projeto(s) listado(s).`}>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar por projeto, cliente, produto ou usuário…"
        className={`${inputClass} mb-4`}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-white/35">
            <tr>
              <th className="pb-2 pr-3">Projeto</th>
              <th className="pb-2 pr-3">Usuário</th>
              <th className="pb-2 pr-3">Cliente</th>
              <th className="pb-2 pr-3">Produto</th>
              <th className="pb-2 pr-3">Medida</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-white/8">
                <td className="py-2 pr-3 font-semibold">{p.name}</td>
                <td className="py-2 pr-3 text-white/55">{p.userName}</td>
                <td className="py-2 pr-3 text-white/55">{p.clientName || "—"}</td>
                <td className="py-2 pr-3 text-white/55">{p.product || "—"}</td>
                <td className="py-2 pr-3 text-white/55">
                  {p.widthMm}×{p.heightMm} mm
                </td>
                <td className="py-2 pr-3 text-white/55">{p.status}</td>
                <td className="py-2 text-white/40">
                  {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ============================ Prompts de IA ============================ */
const EMPTY_STYLE = {
  name: "",
  description: "",
  prompt: "",
  credits: 2,
  multiImage: false,
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\̀-\ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function PromptsTab() {
  const styles = useStudioStyles(true);
  const save = useSaveStudioStyle();
  const remove = useDeleteStudioStyle();
  const [drafts, setDrafts] = useState<Record<number, { prompt: string; credits: number; name: string }>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [novo, setNovo] = useState(EMPTY_STYLE);

  async function createStyle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const slug = slugify(novo.name);
    if (!slug) {
      setError("Dê um nome ao novo estilo.");
      return;
    }
    if (novo.prompt.trim().length < 10) {
      setError("O prompt precisa ter pelo menos 10 caracteres.");
      return;
    }
    if ((styles.data ?? []).some((s) => s.slug === slug)) {
      setError("Já existe um estilo com esse nome.");
      return;
    }
    try {
      await save.mutateAsync({
        slug,
        name: novo.name.trim(),
        description: novo.description.trim() || null,
        prompt: novo.prompt.trim(),
        credits: novo.credits,
        multiImage: novo.multiImage,
        active: true,
        sortOrder: (styles.data?.length ?? 0) + 1,
      });
      setNovo(EMPTY_STYLE);
      setAdding(false);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <Section
      title="Editor de prompts de IA"
      hint="Os prompts ficam apenas no servidor — nunca são enviados para o navegador dos usuários beta. Estilos criados aqui aparecem na hora no painel principal do projeto."
    >
      <div className="mb-4">
        <button onClick={() => setAdding((v) => !v)} className={goldBtn}>
          <Plus className="h-3.5 w-3.5" /> {adding ? "Cancelar" : "Novo prompt de IA"}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={createStyle}
          className="mb-5 space-y-3 rounded-xl border border-[#C9A24B]/30 bg-[#C9A24B]/[0.06] p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="st-n">
                Nome do estilo
              </label>
              <input
                id="st-n"
                value={novo.name}
                onChange={(e) => setNovo({ ...novo, name: e.target.value })}
                placeholder="Ex.: Retrato em linhas"
                required
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-white/35">
                Identificador: {slugify(novo.name) || "—"}
              </p>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="st-d">
                Descrição (aparece no botão do projeto)
              </label>
              <input
                id="st-d"
                value={novo.description}
                onChange={(e) => setNovo({ ...novo, description: e.target.value })}
                placeholder="Traços finos, alto contraste…"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="st-p">
              Prompt enviado para a IA
            </label>
            <textarea
              id="st-p"
              value={novo.prompt}
              onChange={(e) => setNovo({ ...novo, prompt: e.target.value })}
              rows={5}
              required
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-white/45">
              Créditos
              <input
                type="number"
                min={0}
                value={novo.credits}
                onChange={(e) => setNovo({ ...novo, credits: Number(e.target.value) })}
                className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-[#C9A24B]/60"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/45">
              <input
                type="checkbox"
                checked={novo.multiImage}
                onChange={(e) => setNovo({ ...novo, multiImage: e.target.checked })}
                className="h-3.5 w-3.5 accent-[#C9A24B]"
              />
              Usa várias imagens de uma vez (como a composta 360°)
            </label>
            <button type="submit" className={`${goldBtn} ml-auto`} disabled={save.isPending}>
              <Save className="h-3.5 w-3.5" /> Criar estilo
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {(styles.data ?? []).map((style) => {
          const draft = drafts[style.id] ?? {
            prompt: style.prompt,
            credits: style.credits,
            name: style.name,
          };
          return (
            <div key={style.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={draft.name}
                  onChange={(e) =>
                    setDrafts({ ...drafts, [style.id]: { ...draft, name: e.target.value } })
                  }
                  className={`${inputClass} max-w-72 flex-1`}
                />
                <label className="flex items-center gap-1.5 text-xs text-white/45">
                  Créditos
                  <input
                    type="number"
                    min={0}
                    value={draft.credits}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [style.id]: { ...draft, credits: Number(e.target.value) },
                      })
                    }
                    className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-[#C9A24B]/60"
                  />
                </label>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/45">
                  {style.slug}
                </span>
                <button
                  onClick={async () => {
                    setError(null);
                    try {
                      await save.mutateAsync({
                        id: style.id,
                        slug: style.slug,
                        name: draft.name,
                        description: style.description,
                        prompt: draft.prompt,
                        credits: draft.credits,
                        multiImage: Boolean(style.multiImage),
                        active: Boolean(style.active),
                        sortOrder: style.sortOrder ?? 0,
                      });
                      setSavedId(style.id);
                    } catch (err) {
                      setError(errMsg(err));
                    }
                  }}
                  className={`${goldBtn} ml-auto`}
                  disabled={save.isPending}
                >
                  <Save className="h-3.5 w-3.5" />
                  {savedId === style.id && !save.isPending ? "Salvo" : "Salvar"}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Excluir o estilo "${style.name}" do painel?`)) return;
                    setError(null);
                    try {
                      await remove.mutateAsync(style.id);
                    } catch (err) {
                      setError(errMsg(err));
                    }
                  }}
                  aria-label="Excluir estilo"
                  className="rounded-full border border-white/12 bg-white/5 p-2 text-white/40 transition-colors hover:border-red-400/40 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={draft.prompt}
                onChange={(e) =>
                  setDrafts({ ...drafts, [style.id]: { ...draft, prompt: e.target.value } })
                }
                rows={5}
                className={`${inputClass} mt-3 font-mono text-xs leading-relaxed`}
              />
            </div>
          );
        })}
      </div>
      <ErrorLine value={error} />
    </Section>
  );
}

/* ============================ Medidas e Produtos ============================ */
function CatalogTab() {
  const saveSize = useSaveStudioSize();
  const deleteSize = useDeleteStudioSize();
  const saveProduct = useSaveStudioProduct();
  const deleteProduct = useDeleteStudioProduct();
  const optionsQuery = useStudioOptions(true);
  const [size, setSize] = useState({ widthMm: 0, heightMm: 0, label: "" });
  const [product, setProduct] = useState({ name: "", models: "" });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <Section title="Medidas rápidas" hint="Aparecem como atalho na criação de projetos (em mm).">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await saveSize.mutateAsync({
                widthMm: size.widthMm,
                heightMm: size.heightMm,
                label: size.label || `${size.widthMm} × ${size.heightMm} mm`,
                sortOrder: 0,
              });
              setSize({ widthMm: 0, heightMm: 0, label: "" });
              optionsQuery.refetch();
            } catch (err) {
              setError(errMsg(err));
            }
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label className={fieldLabel} htmlFor="sz-w">
              Largura (mm)
            </label>
            <input
              id="sz-w"
              type="number"
              min={1}
              value={size.widthMm || ""}
              onChange={(e) => setSize({ ...size, widthMm: Number(e.target.value) })}
              required
              className={`${inputClass} w-32`}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="sz-h">
              Altura (mm)
            </label>
            <input
              id="sz-h"
              type="number"
              min={1}
              value={size.heightMm || ""}
              onChange={(e) => setSize({ ...size, heightMm: Number(e.target.value) })}
              required
              className={`${inputClass} w-32`}
            />
          </div>
          <div className="min-w-48 flex-1">
            <label className={fieldLabel} htmlFor="sz-l">
              Rótulo (opcional)
            </label>
            <input
              id="sz-l"
              value={size.label}
              onChange={(e) => setSize({ ...size, label: e.target.value })}
              placeholder="Ex.: Copo 500ml"
              className={inputClass}
            />
          </div>
          <button type="submit" className={goldBtn} disabled={saveSize.isPending}>
            <Save className="h-3.5 w-3.5" /> Adicionar
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {(optionsQuery.data?.sizes ?? []).map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs"
            >
              {s.widthMm} × {s.heightMm} mm
              {s.label && <span className="text-white/35">{s.label}</span>}
              <button
                onClick={async () => {
                  await deleteSize.mutateAsync(s.id);
                  optionsQuery.refetch();
                }}
                className="text-white/35 transition-colors hover:text-red-300"
                aria-label="Excluir medida"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <ErrorLine value={error} />
      </Section>

      <Section title="Produtos" hint="Modelos separados por vírgula aparecem como opções no projeto.">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await saveProduct.mutateAsync({
                name: product.name,
                models: product.models || null,
                sortOrder: 0,
              });
              setProduct({ name: "", models: "" });
              optionsQuery.refetch();
            } catch (err) {
              setError(errMsg(err));
            }
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-40 flex-1">
            <label className={fieldLabel} htmlFor="pr-n">
              Produto
            </label>
            <input
              id="pr-n"
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div className="min-w-48 flex-[2]">
            <label className={fieldLabel} htmlFor="pr-m">
              Modelos
            </label>
            <input
              id="pr-m"
              value={product.models}
              onChange={(e) => setProduct({ ...product, models: e.target.value })}
              placeholder="500ml, 750ml, 1L"
              className={inputClass}
            />
          </div>
          <button type="submit" className={goldBtn} disabled={saveProduct.isPending}>
            <Save className="h-3.5 w-3.5" /> Adicionar
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {(optionsQuery.data?.products ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
            >
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-white/40">{p.models || "sem modelos"}</span>
              <button
                onClick={async () => {
                  await deleteProduct.mutateAsync(p.id);
                  optionsQuery.refetch();
                }}
                className="ml-auto text-white/35 transition-colors hover:text-red-300"
                aria-label="Excluir produto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ============================ Mockups ============================ */
function MockupsTab() {
  const mockups = useStudioMockups(true);
  const save = useSaveStudioMockup();
  const remove = useDeleteStudioMockup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", kind: "copo", finish: "prata" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Section
      title="Imagens de mockup"
      hint="Base para a prévia 360° (copo, garrafa, canivete, chaveiro) nos acabamentos prata, preta e branca."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          try {
            const file = fileRef.current?.files?.[0] ?? null;
            const imageKey = file ? await uploadStudioFile(file) : null;
            await save.mutateAsync({
              name: form.name,
              kind: form.kind,
              finish: form.finish,
              imageKey,
              sortOrder: 0,
            });
            setForm({ name: "", kind: "copo", finish: "prata" });
            if (fileRef.current) fileRef.current.value = "";
          } catch (err) {
            setError(errMsg(err));
          } finally {
            setBusy(false);
          }
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-40 flex-1">
          <label className={fieldLabel} htmlFor="mk-n">
            Nome
          </label>
          <input
            id="mk-n"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="mk-k">
            Tipo
          </label>
          <select
            id="mk-k"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
            className={inputClass}
          >
            {["copo", "garrafa", "canivete", "chaveiro"].map((k) => (
              <option key={k} value={k} className="bg-[#111112]">
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={fieldLabel} htmlFor="mk-f">
            Acabamento
          </label>
          <select
            id="mk-f"
            value={form.finish}
            onChange={(e) => setForm({ ...form, finish: e.target.value })}
            className={inputClass}
          >
            {["prata", "preta", "branca"].map((f) => (
              <option key={f} value={f} className="bg-[#111112]">
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={fieldLabel}>Imagem</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="w-56 text-xs text-white/50"
          />
        </div>
        <button type="submit" className={goldBtn} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar
        </button>
      </form>
      <ErrorLine value={error} />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(mockups.data ?? []).map((m) => (
          <div key={m.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-white/5">
              {m.url ? (
                <img src={m.url} alt={m.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-white/30">
                  sem imagem
                </div>
              )}
            </div>
            <p className="text-sm font-semibold">{m.name}</p>
            <p className="text-xs text-white/40">
              {m.kind} · {m.finish}
            </p>
            <button
              onClick={() => remove.mutate(m.id)}
              className="mt-2 text-xs text-white/40 transition-colors hover:text-red-300"
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================ Feedbacks ============================ */
function FeedbacksTab() {
  const feedbacks = useStudioFeedbacks(true);
  const remove = useDeleteStudioFeedback();

  return (
    <Section title="Feedbacks recebidos" hint={`${feedbacks.data?.length ?? 0} mensagem(ns).`}>
      {feedbacks.isLoading && <p className="text-sm text-white/45">Carregando…</p>}
      {feedbacks.data?.length === 0 && (
        <p className="text-sm text-white/40">Nenhum feedback enviado ainda.</p>
      )}
      <div className="space-y-3">
        {(feedbacks.data ?? []).map((f) => (
          <div key={f.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/40">
              <span className="font-semibold text-white/70">{f.userName}</span>
              {f.feature && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                  {f.feature}
                </span>
              )}
              <span>{f.createdAt ? new Date(f.createdAt).toLocaleString("pt-BR") : ""}</span>
              <button
                onClick={() => remove.mutate(f.id)}
                className="ml-auto text-white/35 transition-colors hover:text-red-300"
                aria-label="Excluir feedback"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {f.problem && (
              <p className="mt-2 text-sm text-white/75">
                <span className="text-white/40">Problema: </span>
                {f.problem}
              </p>
            )}
            {f.suggestion && (
              <p className="mt-1 text-sm text-white/75">
                <span className="text-white/40">Sugestão: </span>
                {f.suggestion}
              </p>
            )}
            {f.url && (
              <a href={f.url} target="_blank" rel="noreferrer">
                <img
                  src={f.url}
                  alt="Anexo do feedback"
                  className="mt-3 max-h-48 rounded-lg border border-white/10"
                />
              </a>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================ Relatório ============================ */
function ReportTab() {
  const report = useStudioReport(true);
  const data = report.data;

  return (
    <div className="space-y-5">
      {data && !data.aiConfigured && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            A chave de IA não está configurada (<code>AI_GATEWAY_API_KEY</code> /{" "}
            <code>AI_GATEWAY_BASE_URL</code>). Enquanto isso, as gerações vão falhar com aviso e nenhum
            crédito é debitado.
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Usuários", value: data?.totals.users ?? 0 },
          { label: "Projetos", value: data?.totals.projects ?? 0 },
          { label: "Imagens geradas/enviadas", value: data?.totals.images ?? 0 },
        ].map((card) => (
          <StudioCard key={card.label}>
            <p className="text-xs uppercase tracking-wide text-white/40">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#E7CE8F]">{card.value}</p>
          </StudioCard>
        ))}
      </div>

      <Section title="Consumo por estilo de IA">
        {data?.byStyle.length === 0 && (
          <p className="text-sm text-white/40">Nenhuma geração registrada ainda.</p>
        )}
        <div className="space-y-2">
          {(data?.byStyle ?? []).map((s) => (
            <div
              key={s.styleSlug}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
            >
              <span className="font-semibold">{s.styleSlug}</span>
              <span className="ml-auto text-white/50">{s.uses} uso(s)</span>
              <span className="flex items-center gap-1.5 text-[#E7CE8F]">
                <Coins className="h-3.5 w-3.5" />
                {s.credits}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Últimos lançamentos de crédito">
        <div className="space-y-1.5 text-sm">
          {(data?.recent ?? []).map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center gap-2 text-white/55">
              <span className="text-white/35">
                {entry.createdAt ? new Date(entry.createdAt).toLocaleString("pt-BR") : ""}
              </span>
              <span className="font-semibold text-white/75">{entry.styleSlug ?? "—"}</span>
              <span className="ml-auto text-[#E7CE8F]">-{entry.amount}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ============================ Página ============================ */
function OwnerPanel() {
  const [tab, setTab] = useState<TabId>("usuarios");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Painel do Proprietário</h1>
          <p className="mt-1 text-sm text-white/45">
            Acessos, créditos, prompts de IA, catálogo, feedbacks e relatório de uso.
          </p>
        </div>
        <Link href="/rafa" className={`${ghostBtn} ml-auto`}>
          Voltar ao painel
        </Link>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              tab === item.id
                ? "bg-[#C9A24B] text-black"
                : "border border-white/10 bg-white/5 text-white/55 hover:text-white"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "usuarios" && <UsersTab />}
      {tab === "projetos" && <ProjectsTab />}
      {tab === "prompts" && <PromptsTab />}
      {tab === "catalogo" && <CatalogTab />}
      {tab === "mockups" && <MockupsTab />}
      {tab === "feedbacks" && <FeedbacksTab />}
      {tab === "relatorio" && <ReportTab />}
    </div>
  );
}

export default function StudioOwnerPage() {
  return (
    <StudioShell requireOwner>
      <OwnerPanel />
    </StudioShell>
  );
}
