import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Calculator,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { CatalogProductDTO } from "../../api/database/schema";
import { uploadFileReturnKey } from "../lib/upload";
import { formatBRL, parseToCents, centsToInput } from "../lib/money";
import {
  useAddCatalogProductToStore,
  useAddMarketPrice,
  useCatalogOpportunities,
  useCatalogProducts,
  useCatalogReport,
  useCatalogSettings,
  useCatalogs,
  useCompareCatalogs,
  useCompareSuppliers,
  useCreateCatalog,
  useDeleteCatalog,
  useDeleteCatalogProduct,
  useRemoveMarketPrice,
  useReanalyzeCatalog,
  useSaveCatalogSettings,
  useSaveSupplier,
  useSearchMarketPrices,
  useSimulateBuy,
  useSuppliers,
  useDeleteSupplier,
} from "../queries/catalog";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold";

const PERSONALIZABLE_LABEL: Record<string, string> = {
  excelente: "Excelente",
  bom: "Bom",
  pouco: "Pouco",
  nao: "Não personalizável",
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  comprar: "Comprar",
  testar: "Testar",
  nao: "Não recomendado",
};

function scoreEmoji(score: number): string {
  if (score >= 85) return "🔥";
  if (score >= 70) return "🟢";
  if (score >= 55) return "🟡";
  if (score >= 40) return "🟠";
  return "🔴";
}

function na(value: string | null | undefined): string {
  return value?.trim() ? value : "Não informado no catálogo.";
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-card p-6 sm:rounded-2xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="pr-8 font-display text-lg font-bold">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function CatalogAiTab() {
  const [catalogId, setCatalogId] = useState<number | null>(null);
  const [view, setView] = useState<
    "produtos" | "top" | "oportunidades" | "relatorio" | "comparar" | "fornecedores" | "simulador"
  >("produtos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogProductDTO | null>(null);

  const catalogs = useCatalogs(true);
  const activeId = catalogId ?? catalogs.data?.[0]?.id ?? null;
  const products = useCatalogProducts(activeId, activeId != null);
  const reanalyze = useReanalyzeCatalog();
  const removeCatalog = useDeleteCatalog();

  const items = products.data ?? [];
  const current = catalogs.data?.find((c) => c.id === activeId) ?? null;
  const selectedFresh = selected ? (items.find((i) => i.id === selected.id) ?? selected) : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="overline text-gold">Compras inteligentes</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold">RAFA CATALOG AI</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inteligência para comprar melhor. Envie o catálogo do fornecedor (PDF, foto, Excel ou
            CSV) e a IA lê todas as páginas, calcula custo real, preço de venda, margem e diz o que
            vale a pena comprar.
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> ENVIAR CATÁLOGO
        </button>
      </div>

      {/* Catálogos enviados */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-gold" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">
            Catálogos enviados
          </h3>
        </div>
        {catalogs.isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </p>
        ) : (catalogs.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum catálogo enviado ainda. Clique em “Enviar catálogo” para começar.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(catalogs.data ?? []).map((c) => {
              const busy = c.status === "analisando" || c.status === "pendente";
              return (
                <button
                  key={c.id}
                  onClick={() => setCatalogId(c.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    activeId === c.id ? "border-gold bg-muted/40" : "border-border hover:border-gold"
                  }`}
                >
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Fornecedor: {c.supplier}</p>
                  <p className="mt-2 text-xs">
                    {busy ? (
                      <span className="inline-flex items-center gap-1.5 text-gold">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analisando o catálogo...
                      </span>
                    ) : c.status === "erro" ? (
                      <span className="inline-flex items-center gap-1.5 text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" /> Erro: {c.error ?? "falha na leitura"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Pronto · {c.productCount ?? 0} produtos
                        {c.pages ? ` · ${c.pages} páginas` : ""}
                      </span>
                    )}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        reanalyze.mutate(c.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold hover:border-gold"
                    >
                      <RefreshCw className="h-3 w-3" /> Reanalisar
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir o catálogo “${c.name}” e seus produtos analisados?`))
                          removeCatalog.mutate(c.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CostPanel />

      {/* Abas internas */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["produtos", "Produtos analisados"],
            ["top", "TOP produtos"],
            ["oportunidades", "Oportunidades"],
            ["relatorio", "Relatório"],
            ["comparar", "Comparações"],
            ["fornecedores", "Fornecedores"],
            ["simulador", "Simulador de compra"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              view === key ? "bg-foreground text-background" : "border border-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === "fornecedores" ? (
          <SuppliersPanel />
        ) : activeId == null ? (
          <p className="text-sm text-muted-foreground">
            Envie um catálogo para ver a análise dos produtos.
          </p>
        ) : products.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...
          </p>
        ) : view === "produtos" ? (
          <ProductsTable items={items} onOpen={setSelected} catalogName={current?.name ?? ""} />
        ) : view === "top" ? (
          <TopCards items={items} onOpen={setSelected} />
        ) : view === "oportunidades" ? (
          <OpportunitiesPanel catalogId={activeId} onOpen={setSelected} />
        ) : view === "relatorio" ? (
          <ReportPanel catalogId={activeId} />
        ) : view === "comparar" ? (
          <ComparePanel activeId={activeId} />
        ) : (
          <SimulatorPanel catalogId={activeId} />
        )}
      </div>

      {uploadOpen ? <UploadModal onClose={() => setUploadOpen(false)} /> : null}
      {selectedFresh ? (
        <ProductModal product={selectedFresh} onClose={() => setSelected(null)} />
      ) : null}

      <p className="mt-10 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong>Como funciona a busca de preços:</strong> abra a ficha de um produto e clique em
        “Buscar preços na internet”. A consulta é feita por IA com acesso à web no Mercado Livre,
        Shopee e Amazon — as lojas bloqueiam acesso direto, então o resultado pode vir incompleto ou
        falhar. Quando isso acontecer, a própria tela avisa e você continua podendo registrar o
        preço na mão.
      </p>
    </div>
  );
}

// ---------------- Envio de catálogo ----------------
function UploadModal({ onClose }: { onClose: () => void }) {
  const create = useCreateCatalog();
  const [name, setName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file || !name.trim() || !supplier.trim()) {
      setError("Informe o nome do catálogo, o fornecedor e escolha o arquivo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { key } = await uploadFileReturnKey(file);
      await create.mutateAsync({
        name: name.trim(),
        supplier: supplier.trim(),
        fileKey: key,
        mimeType: file.type || "application/octet-stream",
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Enviar catálogo do fornecedor" onClose={onClose}>
      <label className="block text-sm font-semibold">
        Nome do catálogo
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Catálogo Verão 2026"
        />
      </label>
      <label className="mt-4 block text-sm font-semibold">
        Fornecedor
        <input
          className={inputCls}
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="Ex.: Distribuidora XYZ"
        />
      </label>
      <div className="mt-4">
        <p className="text-sm font-semibold">Arquivo (PDF, foto, Excel ou CSV)</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-1.5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-4 text-sm hover:border-gold"
        >
          <Upload className="h-4 w-4" />
          {file ? file.name : "Escolher arquivo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          A IA lê todas as páginas. Catálogos de 50 a 200 páginas levam alguns minutos — pode fechar
          esta janela, o status aparece na lista.
        </p>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
        {busy ? "Enviando..." : "Analisar com a IA"}
      </button>
    </Modal>
  );
}

// ---------------- Painel de custos ----------------
function CostPanel() {
  const settings = useCatalogSettings(true);
  const save = useSaveCatalogSettings();
  const [open, setOpen] = useState(false);
  const s = settings.data;
  const [form, setForm] = useState<{
    freightPct: string;
    taxPct: string;
    otherPct: string;
    packagingCost: string;
    marginPct: string;
    markupPct: string;
  } | null>(null);

  const values = form ?? {
    freightPct: String(s?.freightPct ?? 12),
    taxPct: String(s?.taxPct ?? 8),
    otherPct: String(s?.otherPct ?? 3),
    packagingCost: centsToInput(s?.packagingCost ?? 150),
    marginPct: String(s?.marginPct ?? 60),
    markupPct: String(s?.markupPct ?? 0),
  };

  function set(key: keyof typeof values, value: string) {
    setForm({ ...values, [key]: value });
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="inline-flex items-center gap-2">
          <Calculator className="h-4 w-4 text-gold" />
          <span className="font-display text-sm font-bold uppercase tracking-wide">
            Meus custos e margem
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          Frete {values.freightPct}% · Impostos {values.taxPct}% · Outros {values.otherPct}% ·
          Embalagem R$ {values.packagingCost} · Margem {values.marginPct}%
        </span>
      </button>
      {open ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-semibold">
            Frete (%)
            <input
              className={inputCls}
              value={values.freightPct}
              onChange={(e) => set("freightPct", e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Impostos (%)
            <input
              className={inputCls}
              value={values.taxPct}
              onChange={(e) => set("taxPct", e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Outros custos (%)
            <input
              className={inputCls}
              value={values.otherPct}
              onChange={(e) => set("otherPct", e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Embalagem por unidade (R$)
            <input
              className={inputCls}
              value={values.packagingCost}
              onChange={(e) => set("packagingCost", e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Margem desejada (%)
            <input
              className={inputCls}
              value={values.marginPct}
              onChange={(e) => set("marginPct", e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Markup extra (%)
            <input
              className={inputCls}
              value={values.markupPct}
              onChange={(e) => set("markupPct", e.target.value)}
            />
          </label>
          <div className="sm:col-span-3">
            <button
              onClick={() =>
                save.mutate({
                  freightPct: Math.max(0, Math.min(100, Number(values.freightPct) || 0)),
                  taxPct: Math.max(0, Math.min(100, Number(values.taxPct) || 0)),
                  otherPct: Math.max(0, Math.min(100, Number(values.otherPct) || 0)),
                  packagingCost: parseToCents(values.packagingCost) ?? 0,
                  marginPct: Math.max(0, Math.min(95, Number(values.marginPct) || 0)),
                  markupPct: Math.max(0, Math.min(300, Number(values.markupPct) || 0)),
                })
              }
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar e recalcular tudo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------- Tabela de produtos ----------------
function ProductsTable({
  items,
  onOpen,
  catalogName,
}: {
  items: CatalogProductDTO[];
  onOpen: (p: CatalogProductDTO) => void;
  catalogName: string;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [rec, setRec] = useState("");
  const [pers, setPers] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category?.trim()).filter(Boolean) as string[])].sort(),
    [items],
  );

  const filtered = items.filter((i) => {
    const text = `${i.name} ${i.code ?? ""} ${i.category ?? ""} ${i.material ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (category && i.category !== category) return false;
    if (rec && i.recommendation !== rec) return false;
    if (pers && i.personalizable !== pers) return false;
    if (minScore && i.score < Number(minScore)) return false;
    const cap = parseToCents(maxPrice);
    if (cap != null && maxPrice && (i.unitPrice == null || i.unitPrice > cap)) return false;
    return true;
  });

  function exportCsv() {
    const header = [
      "Código",
      "Produto",
      "Categoria",
      "Preço fornecedor",
      "Qtd. caixa",
      "Custo da caixa",
      "Custo real un.",
      "Preço sugerido",
      "Lucro un.",
      "Material",
      "Personalizável",
      "Nota",
      "Recomendação",
      "Página",
    ];
    const rows = filtered.map((i) => [
      i.code ?? "",
      i.name,
      i.category ?? "",
      i.unitPrice != null ? (i.unitPrice / 100).toFixed(2) : "",
      i.boxQty ?? "",
      i.boxPrice != null ? (i.boxPrice / 100).toFixed(2) : "",
      i.math.realUnitCost != null ? (i.math.realUnitCost / 100).toFixed(2) : "",
      i.math.suggestedPrice != null ? (i.math.suggestedPrice / 100).toFixed(2) : "",
      i.math.grossProfit != null ? (i.math.grossProfit / 100).toFixed(2) : "",
      i.material ?? "",
      PERSONALIZABLE_LABEL[i.personalizable] ?? i.personalizable,
      i.score,
      RECOMMENDATION_LABEL[i.recommendation] ?? i.recommendation,
      i.sourcePage ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `catalogo-${(catalogName || "rafa-laser").toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-semibold">
          Buscar
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputCls} pl-9`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, código, material..."
            />
          </span>
        </label>
        <label className="block text-sm font-semibold">
          Categoria
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Recomendação
          <select className={inputCls} value={rec} onChange={(e) => setRec(e.target.value)}>
            <option value="">Todas</option>
            <option value="comprar">Comprar</option>
            <option value="testar">Testar</option>
            <option value="nao">Não recomendado</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Personalizável
          <select className={inputCls} value={pers} onChange={(e) => setPers(e.target.value)}>
            <option value="">Todos</option>
            <option value="excelente">Excelente</option>
            <option value="bom">Bom</option>
            <option value="pouco">Pouco</option>
            <option value="nao">Não personalizável</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Nota mínima
          <select className={inputCls} value={minScore} onChange={(e) => setMinScore(e.target.value)}>
            <option value="">Qualquer</option>
            <option value="85">85+ 🔥</option>
            <option value="70">70+ 🟢</option>
            <option value="55">55+ 🟡</option>
            <option value="40">40+ 🟠</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Preço do fornecedor até (R$)
          <input
            className={inputCls}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Ex.: 30,00"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} de {items.length} produtos
        </p>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-gold"
        >
          <FileSpreadsheet className="h-4 w-4" /> Exportar Excel/CSV
        </button>
      </div>

      {/* Tabela (desktop) */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Preço fornec.</th>
              <th className="px-4 py-3">Qtd. caixa</th>
              <th className="px-4 py-3">Custo caixa</th>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Personaliz.</th>
              <th className="px-4 py-3">Nota</th>
              <th className="px-4 py-3">Recomendação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr
                key={i.id}
                onClick={() => onOpen(i)}
                className="cursor-pointer border-t border-border hover:bg-muted/30"
              >
                <td className="px-4 py-3 text-xs text-muted-foreground">{i.code ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">{i.name}</td>
                <td className="px-4 py-3">{i.category ?? "—"}</td>
                <td className="px-4 py-3">{i.unitPrice != null ? formatBRL(i.unitPrice) : "—"}</td>
                <td className="px-4 py-3">{i.boxQty ?? "—"}</td>
                <td className="px-4 py-3">{i.boxPrice != null ? formatBRL(i.boxPrice) : "—"}</td>
                <td className="px-4 py-3">{i.material ?? "—"}</td>
                <td className="px-4 py-3">{PERSONALIZABLE_LABEL[i.personalizable]}</td>
                <td className="px-4 py-3 font-bold">
                  {scoreEmoji(i.score)} {i.score}
                </td>
                <td className="px-4 py-3">{RECOMMENDATION_LABEL[i.recommendation]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="mt-4 grid gap-3 md:hidden">
        {filtered.map((i) => (
          <button
            key={i.id}
            onClick={() => onOpen(i)}
            className="rounded-2xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{i.name}</p>
              <span className="whitespace-nowrap text-sm font-bold">
                {scoreEmoji(i.score)} {i.score}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {i.code ?? "sem código"} · {i.category ?? "sem categoria"}
            </p>
            <p className="mt-2 text-sm">
              Fornecedor: {i.unitPrice != null ? formatBRL(i.unitPrice) : "—"} · Sugerido:{" "}
              {formatBRL(i.math.suggestedPrice)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {RECOMMENDATION_LABEL[i.recommendation]} · {PERSONALIZABLE_LABEL[i.personalizable]}
            </p>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum produto com esses filtros.</p>
      ) : null}
    </div>
  );
}

// ---------------- TOP produtos ----------------
function TopCards({
  items,
  onOpen,
}: {
  items: CatalogProductDTO[];
  onOpen: (p: CatalogProductDTO) => void;
}) {
  const byScore = [...items].sort((a, b) => b.score - a.score).slice(0, 10);
  const byPersonalization = items
    .filter((i) => i.personalizable === "excelente" || i.personalizable === "bom")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const byMargin = [...items]
    .filter((i) => i.math.marginPct != null)
    .sort((a, b) => (b.math.marginPct ?? 0) - (a.math.marginPct ?? 0))
    .slice(0, 10);
  const byLowPrice = [...items]
    .filter((i) => i.unitPrice != null)
    .sort((a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0))
    .slice(0, 10);
  const byLowInvestment = [...items]
    .filter((i) => i.math.investment != null)
    .sort((a, b) => (a.math.investment ?? 0) - (b.math.investment ?? 0))
    .slice(0, 10);
  const byMarket = items
    .filter((i) => i.marketAvg != null && i.math.realUnitCost != null)
    .sort(
      (a, b) =>
        (b.marketAvg! - b.math.realUnitCost!) - (a.marketAvg! - a.math.realUnitCost!),
    )
    .slice(0, 10);

  const groups: [string, CatalogProductDTO[], string][] = [
    ["🔥 10 melhores para comprar agora", byScore, "Melhor nota geral"],
    ["✨ Melhores para personalizar", byPersonalization, "Ideais para gravação a laser"],
    ["💰 Maior margem de lucro", byMargin, "Margem calculada com seus custos"],
    ["⚡ Maior giro (menor preço)", byLowPrice, "Preço baixo = venda rápida"],
    ["🪙 Baixo investimento", byLowInvestment, "Menor valor para começar"],
    ["📊 Melhor diferença para o mercado", byMarket, "Só com preço de mercado registrado"],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.map(([title, list, subtitle]) => (
        <div key={title} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display text-sm font-bold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {list.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sem dados suficientes.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {list.map((i) => (
                <li key={i.id}>
                  <button
                    onClick={() => onOpen(i)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:text-gold"
                  >
                    <span className="truncate">{i.name}</span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatBRL(i.unitPrice)} → {formatBRL(i.math.suggestedPrice)} ·{" "}
                      {scoreEmoji(i.score)} {i.score}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------- Ficha do produto ----------------
function ProductModal({
  product,
  onClose,
}: {
  product: CatalogProductDTO;
  onClose: () => void;
}) {
  const addPrice = useAddMarketPrice();
  const removePrice = useRemoveMarketPrice();
  const addToStore = useAddCatalogProductToStore();
  const removeProduct = useDeleteCatalogProduct();
  const searchPrices = useSearchMarketPrices();
  const [searchMsg, setSearchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    store: "",
    price: "",
    promo: "",
    availability: "",
    shipping: "",
    url: "",
    matchType: "equivalente" as "exato" | "equivalente" | "diferente",
  });
  const [done, setDone] = useState<string | null>(null);

  const m = product.math;
  const verdict =
    m.marketVerdict === "abaixo"
      ? "Preço do fornecedor está abaixo do mercado — boa oportunidade."
      : m.marketVerdict === "negociar"
        ? "Preço parecido com o mercado — vale negociar."
        : m.marketVerdict === "acima"
          ? "Preço acima do mercado — não compensa."
          : "Sem preço de mercado registrado.";

  return (
    <Modal title={product.name} onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Info label="Código" value={na(product.code)} />
        <Info label="Categoria" value={na(product.category)} />
        <Info label="Material" value={na(product.material)} />
        <Info label="Marca" value={na(product.brand)} />
        <Info label="Dimensões" value={na(product.dimensions)} />
        <Info label="Cores" value={na(product.colors)} />
        <Info
          label="Página do catálogo"
          value={product.sourcePage ? String(product.sourcePage) : "Não informado no catálogo."}
        />
        <Info label="Personalização" value={PERSONALIZABLE_LABEL[product.personalizable]} />
      </div>

      {product.laserNote ? (
        <p className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {product.laserNote}
        </p>
      ) : null}

      <div className="mt-5 rounded-2xl border border-border p-4">
        <h4 className="font-display text-sm font-bold">Números</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Info label="Preço do fornecedor" value={formatBRL(product.unitPrice)} />
          <Info label="Qtd. na caixa" value={product.boxQty ? String(product.boxQty) : "—"} />
          <Info label="Custo da caixa" value={formatBRL(product.boxPrice)} />
          <Info label="Custo real por unidade" value={formatBRL(m.realUnitCost)} />
          <Info label="Preço sugerido de venda" value={formatBRL(m.suggestedPrice)} />
          <Info
            label="Lucro por unidade"
            value={`${formatBRL(m.grossProfit)}${m.marginPct != null ? ` (${m.marginPct}%)` : ""}`}
          />
          <Info label="Investimento (caixa)" value={formatBRL(m.investment)} />
          <Info label="Faturamento potencial" value={formatBRL(m.potentialRevenue)} />
          <Info label="Lucro potencial" value={formatBRL(m.potentialProfit)} />
          <Info label="Preço máximo recomendado de compra" value={formatBRL(m.maxBuyPrice)} />
          <Info label="Preço médio de mercado" value={formatBRL(product.marketAvg)} />
          <Info label="Veredito de mercado" value={verdict} />
        </div>
        {m.isOpportunity ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 p-3 text-xs font-semibold text-gold">
            <TrendingUp className="h-4 w-4" /> Oportunidade: o mercado cobra {m.opportunityPct}%
            acima do seu custo real por unidade.
          </p>
        ) : null}
        {m.highInvestmentAlert ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4" /> Investimento alto: acima de R$ 2.000 para fechar a
            caixa.
          </p>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl border border-border p-4">
        <h4 className="font-display text-sm font-bold">Nota {product.score}/100</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          {scoreEmoji(product.score)} {RECOMMENDATION_LABEL[product.recommendation]} —{" "}
          {product.reason ?? "Sem observações."}
        </p>
      </div>

      {/* Preços de mercado */}
      <div className="mt-5 rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-gold" />
            <h4 className="font-display text-sm font-bold">Preços de mercado</h4>
          </div>
          <button
            onClick={async () => {
              setSearchMsg(null);
              const res = await searchPrices.mutateAsync(product.id);
              setSearchMsg({ ok: res.ok && res.added > 0, text: res.message });
            }}
            disabled={searchPrices.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60"
          >
            {searchPrices.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {searchPrices.isPending ? "Buscando na internet..." : "Buscar preços na internet"}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          A busca consulta Mercado Livre, Shopee e Amazon por IA com acesso à web. Pode falhar ou
          vir incompleta — nesse caso, registre o preço manualmente no formulário abaixo.
        </p>
        {searchPrices.isPending ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Procurando anúncios reais nas três lojas.
            Isso leva alguns segundos.
          </p>
        ) : searchMsg ? (
          <p
            className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs ${
              searchMsg.ok
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {searchMsg.ok ? (
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{searchMsg.text}</span>
          </p>
        ) : null}
        {product.sources.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum preço registrado. Use a busca automática acima ou adicione manualmente o que você
            encontrou nas lojas.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {product.sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <strong>{s.store}</strong> · {formatBRL(s.promoPrice ?? s.price)}{" "}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      s.source === "auto"
                        ? "bg-gold/15 text-gold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.source === "auto" ? "automático" : "manual"}
                  </span>{" "}
                  ·{" "}
                  <span className="text-xs text-muted-foreground">
                    {s.matchType}
                    {s.availability ? ` · ${s.availability}` : ""}
                    {s.shipping ? ` · frete ${s.shipping}` : ""}
                  </span>
                  {s.url ? (
                    <>
                      {" "}
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gold underline"
                      >
                        ver
                      </a>
                    </>
                  ) : null}
                </span>
                <button
                  onClick={() => removePrice.mutate(s.id)}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold">
            Loja
            <input
              className={inputCls}
              value={form.store}
              onChange={(e) => setForm({ ...form, store: e.target.value })}
              placeholder="Mercado Livre, Shopee..."
            />
          </label>
          <label className="block text-sm font-semibold">
            Preço (R$)
            <input
              className={inputCls}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="49,90"
            />
          </label>
          <label className="block text-sm font-semibold">
            Promoção (R$)
            <input
              className={inputCls}
              value={form.promo}
              onChange={(e) => setForm({ ...form, promo: e.target.value })}
              placeholder="opcional"
            />
          </label>
          <label className="block text-sm font-semibold">
            Disponibilidade
            <input
              className={inputCls}
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
              placeholder="Em estoque"
            />
          </label>
          <label className="block text-sm font-semibold">
            Frete
            <input
              className={inputCls}
              value={form.shipping}
              onChange={(e) => setForm({ ...form, shipping: e.target.value })}
              placeholder="Grátis"
            />
          </label>
          <label className="block text-sm font-semibold">
            Correspondência
            <select
              className={inputCls}
              value={form.matchType}
              onChange={(e) =>
                setForm({ ...form, matchType: e.target.value as typeof form.matchType })
              }
            >
              <option value="exato">Produto exato</option>
              <option value="equivalente">Produto equivalente</option>
              <option value="diferente">Produto diferente</option>
            </select>
          </label>
          <label className="block text-sm font-semibold sm:col-span-3">
            Link do anúncio
            <input
              className={inputCls}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
            />
          </label>
        </div>
        <button
          onClick={async () => {
            const price = parseToCents(form.price);
            if (!form.store.trim() || price == null) {
              setDone("Informe a loja e o preço.");
              return;
            }
            await addPrice.mutateAsync({
              productId: product.id,
              store: form.store.trim(),
              priceBrl: price / 100,
              promoPriceBrl: form.promo ? (parseToCents(form.promo) ?? 0) / 100 : null,
              availability: form.availability || null,
              shipping: form.shipping || null,
              url: form.url || null,
              matchType: form.matchType,
            });
            setForm({ ...form, store: "", price: "", promo: "", url: "" });
            setDone("Preço registrado.");
          }}
          disabled={addPrice.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-gold disabled:opacity-60"
        >
          {addPrice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar preço de mercado
        </button>
      </div>

      {done ? <p className="mt-3 text-sm text-gold">{done}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={async () => {
            if (!confirm("Adicionar este produto ao cadastro da Rafa Laser?")) return;
            const res = await addToStore.mutateAsync({ id: product.id });
            setDone(
              `Produto criado no cadastro (desativado, para você revisar): /produtos/${res.slug}`,
            );
          }}
          disabled={addToStore.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black disabled:opacity-60"
        >
          {addToStore.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar ao cadastro de Produtos
        </button>
        <a
          href="/personalizacao"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-gold"
        >
          Ver opções de personalização
        </a>
        <button
          onClick={() => {
            if (confirm("Excluir este produto da análise?")) {
              removeProduct.mutate(product.id);
              onClose();
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Excluir da análise
        </button>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

// ---------------- Relatório ----------------
function ReportPanel({ catalogId }: { catalogId: number }) {
  const report = useCatalogReport(catalogId, true);
  const r = report.data;

  if (report.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Montando relatório...
      </p>
    );
  }
  if (!r) return <p className="text-sm text-muted-foreground">Sem relatório para este catálogo.</p>;

  return (
    <div className="print:text-black">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Relatório · {r.file.name}</h3>
          <p className="text-sm text-muted-foreground">
            Fornecedor {r.file.supplier} · {r.total} produtos analisados
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-gold print:hidden"
        >
          <Download className="h-4 w-4" /> Salvar em PDF
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Recomendados" value={String(r.recommended)} />
        <Stat label="Para testar" value={String(r.toTest)} />
        <Stat label="Descartados" value={String(r.rejected)} />
        <Stat label="Com preço de mercado" value={String(r.withMarket)} />
        <Stat label="Investimento nos recomendados" value={formatBRL(r.investment)} />
        <Stat label="Faturamento potencial" value={formatBRL(r.potentialRevenue)} />
        <Stat label="Lucro potencial" value={formatBRL(r.potentialProfit)} />
        <Stat label="Margem configurada" value={`${r.settings.marginPct}%`} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Sugerido</th>
              <th className="px-4 py-3">Lucro un.</th>
              <th className="px-4 py-3">Nota</th>
            </tr>
          </thead>
          <tbody>
            {r.top20.map((i, idx) => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold">{i.name}</td>
                <td className="px-4 py-3">{formatBRL(i.unitPrice)}</td>
                <td className="px-4 py-3">{formatBRL(i.math.suggestedPrice)}</td>
                <td className="px-4 py-3">{formatBRL(i.math.grossProfit)}</td>
                <td className="px-4 py-3 font-bold">
                  {scoreEmoji(i.score)} {i.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}

// ---------------- Comparações ----------------
function ComparePanel({ activeId }: { activeId: number }) {
  const catalogs = useCatalogs(true);
  const [oldId, setOldId] = useState<number | null>(null);
  const compare = useCompareCatalogs(oldId, activeId);
  const suppliers = useCompareSuppliers(true);

  const statusLabel: Record<string, string> = {
    novo: "Novo",
    subiu: "Preço subiu",
    caiu: "Preço caiu",
    igual: "Igual",
    removido: "Saiu do catálogo",
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          Catálogo antigo × catálogo atual
        </h3>
        <label className="mt-3 block max-w-sm text-sm font-semibold">
          Comparar com
          <select
            className={inputCls}
            value={oldId ?? ""}
            onChange={(e) => setOldId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Escolher catálogo antigo</option>
            {(catalogs.data ?? [])
              .filter((c) => c.id !== activeId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.supplier}
                </option>
              ))}
          </select>
        </label>
        {compare.data ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2">Produto</th>
                  <th className="py-2">Antes</th>
                  <th className="py-2">Agora</th>
                  <th className="py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {compare.data.map((c, i) => (
                  <tr key={`${c.name}-${i}`} className="border-t border-border">
                    <td className="py-2 font-semibold">{c.name}</td>
                    <td className="py-2">{formatBRL(c.before)}</td>
                    <td className="py-2">{formatBRL(c.after)}</td>
                    <td className="py-2">{statusLabel[c.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          Mesmo produto em fornecedores diferentes
        </h3>
        {suppliers.isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Comparando...
          </p>
        ) : (suppliers.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum produto repetido entre fornecedores ainda. Envie catálogos de outro fornecedor
            para comparar.
          </p>
        ) : (
          <div className="mt-3 grid gap-4">
            {(suppliers.data ?? []).map((g) => (
              <div key={g.key} className="rounded-xl border border-border p-4">
                <p className="font-semibold">{g.name}</p>
                <ul className="mt-2 divide-y divide-border text-sm">
                  {g.items
                    .slice()
                    .sort((a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0))
                    .map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                        <span>{i.supplier}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatBRL(i.unitPrice)} · custo real {formatBRL(i.math.realUnitCost)} ·{" "}
                          {scoreEmoji(i.score)} {i.score}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Simulador de compra ----------------
function SimulatorPanel({ catalogId }: { catalogId: number }) {
  const simulate = useSimulateBuy();
  const [custom, setCustom] = useState("");
  const presets = [50000, 100000, 200000, 300000, 500000, 1000000];
  const result = simulate.data;

  function run(budget: number) {
    simulate.mutate({ catalogId, budget });
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gold" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">
            Se eu tiver este valor, o que devo comprar?
          </h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => run(p)}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-gold"
            >
              {formatBRL(p)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block text-sm font-semibold">
            Outro valor (R$)
            <input
              className={inputCls}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="1.500,00"
            />
          </label>
          <button
            onClick={() => {
              const cents = parseToCents(custom);
              if (cents && cents > 0) run(cents);
            }}
            disabled={simulate.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background disabled:opacity-60"
          >
            {simulate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simular
          </button>
        </div>
      </div>

      {result ? (
        <div className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Orçamento" value={formatBRL(result.budget)} />
            <Stat label="Investido" value={formatBRL(result.used)} />
            <Stat label="Faturamento previsto" value={formatBRL(result.revenue)} />
            <Stat label="Lucro previsto" value={formatBRL(result.profit)} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Qtd.</th>
                  <th className="px-4 py-3">Investimento</th>
                  <th className="px-4 py-3">Venda un.</th>
                  <th className="px-4 py-3">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {result.picks.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3">{p.qty}</td>
                    <td className="px-4 py-3">{formatBRL(p.investment)}</td>
                    <td className="px-4 py-3">{formatBRL(p.suggestedPrice)}</td>
                    <td className="px-4 py-3">{formatBRL(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Sobra do orçamento: {formatBRL(result.left)}. A simulação respeita a quantidade mínima da
            caixa e usa no máximo 35% do valor em um único produto.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ---------------- Alertas de oportunidade ----------------
function OpportunitiesPanel({
  catalogId,
  onOpen,
}: {
  catalogId: number;
  onOpen: (p: CatalogProductDTO) => void;
}) {
  const opportunities = useCatalogOpportunities(catalogId, true);
  const items = opportunities.data ?? [];

  if (opportunities.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Procurando oportunidades...
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          Nenhuma oportunidade encontrada ainda
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Uma oportunidade aparece aqui quando o preço de mercado do produto está pelo menos 100%
          acima do seu custo real por unidade. Para isso, o produto precisa ter preço de mercado —
          abra a ficha de um produto e use “Buscar preços na internet” ou registre o preço na mão.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-gold">
          <TrendingUp className="h-4 w-4" />
          {items.length} produto(s) com preço de mercado bem acima do seu custo real.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p)}
            className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-gold"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-gold">
              +{p.math.opportunityPct}% acima do custo
            </p>
            <p className="mt-1.5 font-semibold leading-snug">{p.name}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>Custo real: {formatBRL(p.math.realUnitCost)}</p>
              <p>Preço médio de mercado: {formatBRL(p.marketAvg)}</p>
              <p>Preço sugerido: {formatBRL(p.math.suggestedPrice)}</p>
              <p>Lucro por unidade: {formatBRL(p.math.grossProfit)}</p>
            </div>
            <p className="mt-3 text-xs font-semibold">
              {scoreEmoji(p.score)} Nota {p.score}/100
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Cadastro de fornecedores ----------------
const EMPTY_SUPPLIER = {
  id: null as number | null,
  name: "",
  stockNote: "",
  freightNote: "",
  freightCost: "",
  leadTimeDays: "",
  minOrderValue: "",
  contact: "",
  notes: "",
};

function SuppliersPanel() {
  const suppliers = useSuppliers(true);
  const save = useSaveSupplier();
  const remove = useDeleteSupplier();
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [open, setOpen] = useState(false);

  const rows = suppliers.data ?? [];

  function edit(s: (typeof rows)[number]) {
    setForm({
      id: s.id,
      name: s.name,
      stockNote: s.stockNote ?? "",
      freightNote: s.freightNote ?? "",
      freightCost: centsToInput(s.freightCost),
      leadTimeDays: s.leadTimeDays != null ? String(s.leadTimeDays) : "",
      minOrderValue: centsToInput(s.minOrderValue),
      contact: s.contact ?? "",
      notes: s.notes ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) return;
    await save.mutateAsync({
      id: form.id,
      name: form.name.trim(),
      stockNote: form.stockNote || null,
      freightNote: form.freightNote || null,
      freightCost: parseToCents(form.freightCost),
      leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : null,
      minOrderValue: parseToCents(form.minOrderValue),
      contact: form.contact || null,
      notes: form.notes || null,
    });
    setOpen(false);
    setForm(EMPTY_SUPPLIER);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Fornecedores</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Guarde aqui o que não vem no catálogo: como está o estoque, quanto custa o frete, em
            quantos dias entrega e qual o pedido mínimo.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_SUPPLIER);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> NOVO FORNECEDOR
        </button>
      </div>

      {suppliers.isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Nenhum fornecedor cadastrado ainda.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-display font-bold">{s.name}</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>Estoque: {na(s.stockNote)}</p>
                <p>
                  Frete: {s.freightCost != null ? formatBRL(s.freightCost) : na(s.freightNote)}
                  {s.freightCost != null && s.freightNote ? ` · ${s.freightNote}` : ""}
                </p>
                <p>Prazo: {s.leadTimeDays != null ? `${s.leadTimeDays} dias` : "Não informado."}</p>
                <p>
                  Pedido mínimo:{" "}
                  {s.minOrderValue != null ? formatBRL(s.minOrderValue) : "Não informado."}
                </p>
                <p>Contato: {na(s.contact)}</p>
                {s.notes ? <p>Obs.: {s.notes}</p> : null}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => edit(s)}
                  className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold hover:border-gold"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir o fornecedor “${s.name}”?`)) remove.mutate(s.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-semibold hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <Modal
          title={form.id ? "Editar fornecedor" : "Novo fornecedor"}
          onClose={() => setOpen(false)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold sm:col-span-2">
              Nome do fornecedor
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Brindes SP"
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Situação do estoque
              <input
                className={inputCls}
                value={form.stockNote}
                onChange={(e) => setForm({ ...form, stockNote: e.target.value })}
                placeholder="Ex.: pronta entrega, canecas em falta"
              />
            </label>
            <label className="block text-sm font-semibold">
              Frete (R$)
              <input
                className={inputCls}
                value={form.freightCost}
                onChange={(e) => setForm({ ...form, freightCost: e.target.value })}
                placeholder="120,00"
              />
            </label>
            <label className="block text-sm font-semibold">
              Observação do frete
              <input
                className={inputCls}
                value={form.freightNote}
                onChange={(e) => setForm({ ...form, freightNote: e.target.value })}
                placeholder="Grátis acima de R$ 1.000"
              />
            </label>
            <label className="block text-sm font-semibold">
              Prazo de entrega (dias)
              <input
                className={inputCls}
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                placeholder="15"
              />
            </label>
            <label className="block text-sm font-semibold">
              Pedido mínimo (R$)
              <input
                className={inputCls}
                value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                placeholder="500,00"
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Contato
              <input
                className={inputCls}
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="WhatsApp, e-mail, vendedor"
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Observações
              <textarea
                className={inputCls}
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Condições de pagamento, negociações, etc."
              />
            </label>
          </div>
          <button
            onClick={submit}
            disabled={save.isPending || !form.name.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar fornecedor
          </button>
        </Modal>
      ) : null}
    </div>
  );
}
