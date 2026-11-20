import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BarChart3,
  ExternalLink,
  Flame,
  Loader2,
  Package,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Target,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import type { DealOfferDTO } from "../../api/database/schema";
import { formatBRL, parseToCents, centsToInput } from "../lib/money";
import {
  useAnalyzeForResale,
  useDealAlertHits,
  useDealAlerts,
  useDealOffers,
  useDealOverview,
  useDealPriceHistory,
  useDealSearches,
  useDealSettings,
  useDealSources,
  useDeleteDealAlert,
  useDeleteDealOffer,
  useDeleteDealSearch,
  useHuntDeals,
  useSaveDealAlert,
  useSaveDealSettings,
  useTopDealOffers,
} from "../queries/deal-hunter";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold";

const SORT_LABEL: Record<string, string> = {
  oportunidade: "Melhor oportunidade",
  desconto: "Maior desconto",
  preco: "Menor preço",
  lucro: "Maior lucro",
  margem: "Maior margem",
};

const CATEGORIES = [
  "Eletrônicos",
  "Casa e cozinha",
  "Papelaria",
  "Presentes e brindes",
  "Beleza",
  "Ferramentas",
  "Infantil",
  "Pet",
  "Outros",
];

function scoreBadge(score: number): { emoji: string; label: string; cls: string } {
  if (score >= 90)
    return { emoji: "🔥", label: "EXCELENTE", cls: "bg-gold/20 text-gold border-gold/40" };
  if (score >= 75)
    return {
      emoji: "🟢",
      label: "ÓTIMA",
      cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
    };
  if (score >= 60)
    return {
      emoji: "🟡",
      label: "BOA",
      cls: "bg-yellow-500/15 text-yellow-600 border-yellow-500/40",
    };
  if (score >= 40)
    return { emoji: "⚪", label: "MODERADA", cls: "bg-muted text-muted-foreground border-border" };
  return {
    emoji: "🔴",
    label: "NÃO RECOMENDADO",
    cls: "bg-destructive/15 text-destructive border-destructive/40",
  };
}

function na(value: string | null | undefined): string {
  return value?.trim() ? value : "Não informado";
}

function numOrNull(v: string): number | null {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && v.trim() !== "" ? Math.round(n) : null;
}

function dateLabel(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
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

// ============================================================
// Card de oferta
// ============================================================
function OfferCard({
  offer,
  onOpen,
  rank,
}: {
  offer: DealOfferDTO;
  onOpen: () => void;
  rank?: number;
}) {
  const badge = scoreBadge(offer.score);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-gold">
      <div className="relative flex h-36 items-center justify-center bg-muted/40">
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.imageUrl}
            alt={offer.productName}
            className="h-full w-full object-contain"
          />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground" />
        )}
        {rank != null && (
          <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[11px] font-bold text-gold">
            #{rank}
          </span>
        )}
        {offer.discountPct != null && offer.discountPct > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-black">
            -{offer.discountPct}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}
          >
            {badge.emoji} {offer.score} · {badge.label}
          </span>
          {offer.insufficientData === 1 && (
            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-600">
              ⚠️ DADOS INSUFICIENTES
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-semibold">{offer.productName}</p>
        <p className="text-xs text-muted-foreground">
          {na(offer.brand)} · {offer.store}
        </p>
        {offer.fakeDiscount === 1 && (
          <p className="mt-2 inline-flex items-start gap-1 text-[11px] font-semibold text-destructive">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> Possível falso desconto
          </p>
        )}
        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-xl font-extrabold text-gold">
            {formatBRL(offer.currentPrice)}
          </span>
          {offer.previousPrice != null && (
            <span className="pb-1 text-xs text-muted-foreground line-through">
              {formatBRL(offer.previousPrice)}
            </span>
          )}
        </div>
        <dl className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Custo total</dt>
            <dd className="font-semibold">{formatBRL(offer.realCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Média de mercado</dt>
            <dd className="font-semibold">
              {offer.marketAvg != null ? formatBRL(offer.marketAvg) : "Não informado"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Revenda sugerida</dt>
            <dd className="font-semibold">{formatBRL(offer.suggestedPrice)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Lucro estimado</dt>
            <dd
              className={`font-bold ${(offer.estProfit ?? 0) > 0 ? "text-emerald-500" : "text-destructive"}`}
            >
              {formatBRL(offer.estProfit)}{" "}
              {offer.estMarginPct != null ? `(${offer.estMarginPct}%)` : ""}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onOpen}
            className="flex-1 rounded-full bg-gold px-3 py-2 text-xs font-bold text-black hover:opacity-90"
          >
            💰 ANALISAR PARA REVENDA
          </button>
          {offer.url && (
            <a
              href={offer.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-gold"
              title="Ver oferta na loja"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Modal de análise de revenda
// ============================================================
function ResaleModal({ offer, onClose }: { offer: DealOfferDTO; onClose: () => void }) {
  const [qty, setQty] = useState("1");
  const [buyPrice, setBuyPrice] = useState(centsToInput(offer.currentPrice));
  const [shipping, setShipping] = useState(centsToInput(offer.shippingCost));
  const analyze = useAnalyzeForResale();
  const result = analyze.data;

  const run = () => {
    analyze.mutate({
      offerId: offer.id,
      quantity: Math.max(1, Number(qty) || 1),
      buyPrice: parseToCents(buyPrice) ?? offer.currentPrice,
      shippingCost: parseToCents(shipping),
    });
  };

  const badge = scoreBadge(result?.score ?? offer.score);

  return (
    <Modal title="Analisar para revenda" onClose={onClose} wide>
      <p className="text-sm font-semibold">{offer.productName}</p>
      <p className="text-xs text-muted-foreground">
        {na(offer.brand)} · {offer.store} · pesquisado em {dateLabel(offer.createdAt)}
      </p>
      {offer.url && (
        <a
          href={offer.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
        >
          Abrir anúncio na loja <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold">
          Preço de compra (R$)
          <input className={inputCls} value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold">
          Frete (R$)
          <input
            className={inputCls}
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            placeholder="Não informado"
          />
        </label>
        <label className="block text-xs font-semibold">
          Quantidade
          <input className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
      </div>

      <button
        onClick={run}
        disabled={analyze.isPending}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60"
      >
        {analyze.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
          </>
        ) : (
          <>💰 ANALISAR PARA REVENDA</>
        )}
      </button>

      {result && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${badge.cls}`}
            >
              {badge.emoji} {result.score} · {badge.label}
            </span>
            {result.insufficientData && (
              <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-600">
                ⚠️ DADOS INSUFICIENTES
              </span>
            )}
            {result.fakeDiscount && (
              <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                Possível falso desconto
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Custo real por unidade</p>
              <p className="font-display text-lg font-bold">{formatBRL(result.realCost)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">
                Investimento ({result.quantity}x)
              </p>
              <p className="font-display text-lg font-bold">{formatBRL(result.investment)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Média de mercado</p>
              <p className="font-display text-lg font-bold">
                {offer.marketAvg != null ? formatBRL(offer.marketAvg) : "Não informado"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {result.scenarios.map((s) => (
              <div
                key={s.key}
                className={`rounded-xl border p-4 ${
                  s.key === "normal" ? "border-gold bg-muted/30" : "border-border"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-gold">{s.label}</p>
                <p className="mt-2 font-display text-xl font-extrabold">{formatBRL(s.price)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lucro unitário {formatBRL(s.profit)} · margem {s.marginPct}%
                </p>
                <p className="mt-1 text-xs font-semibold">
                  Total {result.quantity}x: {formatBRL(s.totalProfit)} de lucro
                </p>
              </div>
            ))}
          </div>

          {result.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-border bg-muted/30 p-3 text-xs">
              {result.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-yellow-600" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {analyze.isError && (
        <p className="mt-4 text-sm text-destructive">
          Não consegui calcular agora. Tente novamente.
        </p>
      )}

      <div className="mt-5 rounded-xl border border-border p-3 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">Dados do anúncio:</strong> frete{" "}
          {offer.shippingCost != null ? formatBRL(offer.shippingCost) : na(offer.shippingNote)} ·
          disponibilidade {na(offer.availability)} · estoque{" "}
          {offer.quantityAvailable != null ? offer.quantityAvailable : "não informado"} · vendedor{" "}
          {na(offer.sellerRating)}
        </p>
        {offer.analysis && <p className="mt-1">Observação da IA: {offer.analysis}</p>}
      </div>
    </Modal>
  );
}

// ============================================================
// Painel de pesquisa
// ============================================================
type HuntForm = {
  query: string;
  category: string;
  maxBuyPrice: string;
  quantity: string;
  minMarginPct: string;
  minSalePrice: string;
  minDiscountPct: string;
  sources: string[];
  sortBy: string;
};

function SearchPanel({
  form,
  setForm,
  sources,
  onHunt,
  loading,
}: {
  form: HuntForm;
  setForm: (f: HuntForm) => void;
  sources: string[];
  onHunt: () => void;
  loading: boolean;
}) {
  const toggleSource = (s: string) => {
    setForm({
      ...form,
      sources: form.sources.includes(s)
        ? form.sources.filter((x) => x !== s)
        : [...form.sources, s],
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-gold" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          Painel de pesquisa
        </h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-semibold lg:col-span-2">
          Produto ou palavra-chave *
          <input
            className={inputCls}
            value={form.query}
            onChange={(e) => setForm({ ...form, query: e.target.value })}
            placeholder="Ex.: caixa de som bluetooth"
          />
        </label>
        <label className="block text-xs font-semibold">
          Categoria
          <select
            className={inputCls}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold">
          Preço máximo de compra (R$)
          <input
            className={inputCls}
            value={form.maxBuyPrice}
            onChange={(e) => setForm({ ...form, maxBuyPrice: e.target.value })}
            placeholder="Ex.: 35,00"
          />
        </label>
        <label className="block text-xs font-semibold">
          Quantidade desejada
          <input
            className={inputCls}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            placeholder="Ex.: 10"
          />
        </label>
        <label className="block text-xs font-semibold">
          Margem mínima desejada (%)
          <input
            className={inputCls}
            value={form.minMarginPct}
            onChange={(e) => setForm({ ...form, minMarginPct: e.target.value })}
            placeholder="Ex.: 50"
          />
        </label>
        <label className="block text-xs font-semibold">
          Preço mínimo de venda (R$)
          <input
            className={inputCls}
            value={form.minSalePrice}
            onChange={(e) => setForm({ ...form, minSalePrice: e.target.value })}
            placeholder="Ex.: 79,90"
          />
        </label>
        <label className="block text-xs font-semibold">
          Desconto mínimo (%)
          <input
            className={inputCls}
            value={form.minDiscountPct}
            onChange={(e) => setForm({ ...form, minDiscountPct: e.target.value })}
            placeholder="Ex.: 20"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="text-xs font-semibold">Sites / fontes de pesquisa</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sources.map((s) => {
              const on = form.sources.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSource(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    on ? "bg-foreground text-background" : "border border-border hover:border-gold"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block text-xs font-semibold">
          Ordenar por
          <select
            className={inputCls}
            value={form.sortBy}
            onChange={(e) => setForm({ ...form, sortBy: e.target.value })}
          >
            {Object.entries(SORT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={onHunt}
        disabled={loading || form.query.trim().length < 2}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Caçando ofertas na internet...
          </>
        ) : (
          <>
            <Search className="h-4 w-4" /> 🔎 CAÇAR OFERTAS
          </>
        )}
      </button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        A busca usa IA com acesso à web real. Pode levar até um minuto e consome créditos.
      </p>
    </div>
  );
}

// ============================================================
// Filtros de resultado
// ============================================================
type ResultFilters = {
  store: string;
  maxPrice: string;
  minDiscountPct: string;
  minMarginPct: string;
  minProfit: string;
  minScore: string;
  onlyAvailable: boolean;
  sortBy: string;
};

const EMPTY_FILTERS: ResultFilters = {
  store: "",
  maxPrice: "",
  minDiscountPct: "",
  minMarginPct: "",
  minProfit: "",
  minScore: "",
  onlyAvailable: false,
  sortBy: "oportunidade",
};

function FiltersBar({
  filters,
  setFilters,
  stores,
}: {
  filters: ResultFilters;
  setFilters: (f: ResultFilters) => void;
  stores: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <label className="block text-xs font-semibold">
          Loja
          <select
            className={inputCls}
            value={filters.store}
            onChange={(e) => setFilters({ ...filters, store: e.target.value })}
          >
            <option value="">Todas</option>
            {stores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold">
          Preço até (R$)
          <input
            className={inputCls}
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Desconto mín. (%)
          <input
            className={inputCls}
            value={filters.minDiscountPct}
            onChange={(e) => setFilters({ ...filters, minDiscountPct: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Margem mín. (%)
          <input
            className={inputCls}
            value={filters.minMarginPct}
            onChange={(e) => setFilters({ ...filters, minMarginPct: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Lucro mín. (R$)
          <input
            className={inputCls}
            value={filters.minProfit}
            onChange={(e) => setFilters({ ...filters, minProfit: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Score mín.
          <input
            className={inputCls}
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Ordenar por
          <select
            className={inputCls}
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            {Object.entries(SORT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-6 flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={filters.onlyAvailable}
            onChange={(e) => setFilters({ ...filters, onlyAvailable: e.target.checked })}
          />
          Só com disponibilidade informada
        </label>
      </div>
      <button
        onClick={() => setFilters(EMPTY_FILTERS)}
        className="mt-3 text-xs font-semibold text-muted-foreground hover:text-gold"
      >
        Limpar filtros
      </button>
    </div>
  );
}

// ============================================================
// Histórico
// ============================================================
function HistoryPanel() {
  const searches = useDealSearches(true);
  const removeSearch = useDeleteDealSearch();
  const [term, setTerm] = useState("");
  const history = useDealPriceHistory(term, term.trim().length >= 2);
  const [openId, setOpenId] = useState<number | null>(null);
  const offers = useDealOffers(
    { searchId: openId, sortBy: "oportunidade", onlyAvailable: false, limit: 60 },
    openId != null,
  );
  const [selected, setSelected] = useState<DealOfferDTO | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gold" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">
            📊 Histórico de ofertas
          </h3>
        </div>
        {searches.isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </p>
        ) : (searches.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma pesquisa feita ainda. Cace as primeiras ofertas na aba “Caçar ofertas”.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Pesquisa</th>
                  <th className="py-2">Data</th>
                  <th className="py-2">Resultados</th>
                  <th className="py-2">Filtros</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(searches.data ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2 font-semibold">
                      {s.query}
                      {s.error && (
                        <span className="ml-2 text-xs text-destructive">falhou</span>
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground">{dateLabel(s.createdAt)}</td>
                    <td className="py-2">{s.resultCount}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {[
                        s.category,
                        s.maxBuyPrice != null ? `até ${formatBRL(s.maxBuyPrice)}` : null,
                        s.minDiscountPct != null ? `desc. ${s.minDiscountPct}%` : null,
                        s.minMarginPct != null ? `margem ${s.minMarginPct}%` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setOpenId(s.id);
                            setTerm(s.query);
                          }}
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-gold"
                        >
                          Ver ofertas
                        </button>
                        <button
                          onClick={() => removeSearch.mutate(s.id)}
                          className="rounded-full border border-border p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive"
                          aria-label="Apagar pesquisa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gold" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">
            Comparar preço atual com pesquisas anteriores
          </h3>
        </div>
        <label className="mt-3 block max-w-md text-xs font-semibold">
          Produto pesquisado
          <input
            className={inputCls}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ex.: caixa de som bluetooth"
          />
        </label>
        {history.data && history.data.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Data</th>
                  <th className="py-2">Pesquisa</th>
                  <th className="py-2">Ofertas</th>
                  <th className="py-2">Menor preço</th>
                  <th className="py-2">Preço médio</th>
                  <th className="py-2">Melhor score</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((h, i) => {
                  const prev = history.data![i - 1];
                  const diff =
                    prev?.minPrice != null && h.minPrice != null ? h.minPrice - prev.minPrice : null;
                  return (
                    <tr key={h.searchId} className="border-t border-border">
                      <td className="py-2 text-muted-foreground">{dateLabel(h.date)}</td>
                      <td className="py-2">{h.query}</td>
                      <td className="py-2">{h.count}</td>
                      <td className="py-2 font-semibold">
                        {h.minPrice != null ? formatBRL(h.minPrice) : "—"}
                        {diff != null && diff !== 0 && (
                          <span
                            className={`ml-2 text-xs ${diff < 0 ? "text-emerald-500" : "text-destructive"}`}
                          >
                            {diff < 0 ? "▼" : "▲"} {formatBRL(Math.abs(diff))}
                          </span>
                        )}
                      </td>
                      <td className="py-2">{h.avgPrice != null ? formatBRL(h.avgPrice) : "—"}</td>
                      <td className="py-2">{h.bestScore ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {term.trim().length >= 2
              ? "Nenhuma pesquisa anterior com esse termo."
              : "Digite um termo para comparar com as pesquisas anteriores."}
          </p>
        )}
      </div>

      {openId != null && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide">
              Ofertas da pesquisa #{openId}
            </h3>
            <button
              onClick={() => setOpenId(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-gold"
            >
              Fechar
            </button>
          </div>
          {offers.isLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </p>
          ) : (offers.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Essa pesquisa não guardou nenhuma oferta.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(offers.data ?? []).map((o) => (
                <OfferCard key={o.id} offer={o} onOpen={() => setSelected(o)} />
              ))}
            </div>
          )}
        </div>
      )}

      {selected && <ResaleModal offer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ============================================================
// Monitoramentos
// ============================================================
function AlertsPanel() {
  const alerts = useDealAlerts(true);
  const hits = useDealAlertHits(true);
  const saveAlert = useSaveDealAlert();
  const removeAlert = useDeleteDealAlert();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "",
    query: "",
    category: "",
    maxPrice: "",
    minDiscountPct: "",
    minMarginPct: "",
  });

  const submit = () => {
    saveAlert.mutate(
      {
        label: form.label.trim() || form.query.trim(),
        query: form.query.trim(),
        category: form.category || null,
        maxPrice: parseToCents(form.maxPrice),
        minDiscountPct: numOrNull(form.minDiscountPct),
        minMarginPct: numOrNull(form.minMarginPct),
        active: true,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({
            label: "",
            query: "",
            category: "",
            maxPrice: "",
            minDiscountPct: "",
            minMarginPct: "",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wide">
              Monitoramentos
            </h3>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-bold text-black hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> NOVO MONITORAMENTO
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ex.: “Monitorar caixa de som Bluetooth abaixo de R$ 35”. A cada caçada, as ofertas que
          baterem o critério aparecem destacadas aqui e no resultado da pesquisa.
        </p>

        {(alerts.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum monitoramento cadastrado.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(alerts.data ?? []).map((a) => (
              <div key={a.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-xs text-muted-foreground">Busca: {a.query}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        saveAlert.mutate({
                          id: a.id,
                          label: a.label,
                          query: a.query,
                          category: a.category,
                          maxPrice: a.maxPrice,
                          minDiscountPct: a.minDiscountPct,
                          minMarginPct: a.minMarginPct,
                          active: a.active !== 1,
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        a.active === 1
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {a.active === 1 ? "ATIVO" : "PAUSADO"}
                    </button>
                    <button
                      onClick={() => removeAlert.mutate(a.id)}
                      className="rounded-full border border-border p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive"
                      aria-label="Apagar monitoramento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs">
                  {[
                    a.maxPrice != null ? `Preço até ${formatBRL(a.maxPrice)}` : null,
                    a.minDiscountPct != null ? `Desconto ≥ ${a.minDiscountPct}%` : null,
                    a.minMarginPct != null ? `Margem ≥ ${a.minMarginPct}%` : null,
                    a.category,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem critérios extras"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {a.hits > 0
                    ? `${a.hits} disparo(s) · último em ${a.lastTriggeredAt ? dateLabel(a.lastTriggeredAt) : "—"}`
                    : "Nenhum disparo ainda"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {(hits.data ?? []).some((h) => h.offers.length > 0) && (
        <div className="rounded-2xl border border-gold/50 bg-card p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-gold">
            🚨 Ofertas que batem os monitoramentos
          </h3>
          <div className="mt-4 space-y-5">
            {(hits.data ?? [])
              .filter((h) => h.offers.length > 0)
              .map((h) => (
                <div key={h.alert.id}>
                  <p className="text-xs font-bold uppercase tracking-wide">{h.alert.label}</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {h.offers.map((o) => (
                      <div key={o.id} className="rounded-xl border border-border p-3">
                        <p className="line-clamp-2 text-sm font-semibold">{o.productName}</p>
                        <p className="text-xs text-muted-foreground">{o.store}</p>
                        <p className="mt-1 font-display text-lg font-bold text-gold">
                          {formatBRL(o.currentPrice)}
                        </p>
                        <p className="text-xs">
                          Score {o.score} · lucro {formatBRL(o.estProfit)}
                        </p>
                        {o.url && (
                          <a
                            href={o.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
                          >
                            VER OFERTA <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {open && (
        <Modal title="Novo monitoramento" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <label className="block text-xs font-semibold">
              Nome do monitoramento
              <input
                className={inputCls}
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex.: Caixa de som barata"
              />
            </label>
            <label className="block text-xs font-semibold">
              Produto / palavra-chave *
              <input
                className={inputCls}
                value={form.query}
                onChange={(e) => setForm({ ...form, query: e.target.value })}
                placeholder="Ex.: caixa de som bluetooth"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold">
                Preço máximo (R$)
                <input
                  className={inputCls}
                  value={form.maxPrice}
                  onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
                  placeholder="Ex.: 35,00"
                />
              </label>
              <label className="block text-xs font-semibold">
                Categoria
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Todas</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Desconto mínimo (%)
                <input
                  className={inputCls}
                  value={form.minDiscountPct}
                  onChange={(e) => setForm({ ...form, minDiscountPct: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold">
                Margem mínima (%)
                <input
                  className={inputCls}
                  value={form.minMarginPct}
                  onChange={(e) => setForm({ ...form, minMarginPct: e.target.value })}
                />
              </label>
            </div>
            <button
              onClick={submit}
              disabled={saveAlert.isPending || form.query.trim().length < 2}
              className="w-full rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60"
            >
              {saveAlert.isPending ? "Salvando..." : "SALVAR MONITORAMENTO"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Configurações
// ============================================================
function SettingsPanel({ sources }: { sources: string[] }) {
  const settings = useDealSettings(true);
  const save = useSaveDealSettings();
  const s = settings.data;
  const [draft, setDraft] = useState<null | {
    enabledSources: string[];
    maxResults: string;
    defaultShipping: string;
    packagingCost: string;
    taxPct: string;
    otherPct: string;
    quickMarginPct: string;
    normalMarginPct: string;
    premiumMarginPct: string;
  }>(null);

  const form =
    draft ??
    (s
      ? {
          enabledSources: s.enabledSources,
          maxResults: String(s.maxResults),
          defaultShipping: centsToInput(s.defaultShipping),
          packagingCost: centsToInput(s.packagingCost),
          taxPct: String(s.taxPct),
          otherPct: String(s.otherPct),
          quickMarginPct: String(s.quickMarginPct),
          normalMarginPct: String(s.normalMarginPct),
          premiumMarginPct: String(s.premiumMarginPct),
        }
      : null);

  if (!form) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações...
      </p>
    );
  }

  const set = (patch: Partial<typeof form>) => setDraft({ ...form, ...patch });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-gold" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          Configurações do caçador
        </h3>
      </div>

      <p className="mt-4 text-xs font-semibold">Fontes de pesquisa habilitadas</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {sources.map((src) => {
          const on = form.enabledSources.includes(src);
          return (
            <button
              key={src}
              type="button"
              onClick={() =>
                set({
                  enabledSources: on
                    ? form.enabledSources.filter((x) => x !== src)
                    : [...form.enabledSources, src],
                })
              }
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                on ? "bg-foreground text-background" : "border border-border hover:border-gold"
              }`}
            >
              {src}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-semibold">
          Limite de resultados por pesquisa
          <input
            className={inputCls}
            value={form.maxResults}
            onChange={(e) => set({ maxResults: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Frete padrão (R$)
          <input
            className={inputCls}
            value={form.defaultShipping}
            onChange={(e) => set({ defaultShipping: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Embalagem por unidade (R$)
          <input
            className={inputCls}
            value={form.packagingCost}
            onChange={(e) => set({ packagingCost: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Impostos (%)
          <input
            className={inputCls}
            value={form.taxPct}
            onChange={(e) => set({ taxPct: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Outros custos (%)
          <input
            className={inputCls}
            value={form.otherPct}
            onChange={(e) => set({ otherPct: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Margem venda rápida (%)
          <input
            className={inputCls}
            value={form.quickMarginPct}
            onChange={(e) => set({ quickMarginPct: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Margem venda normal (%)
          <input
            className={inputCls}
            value={form.normalMarginPct}
            onChange={(e) => set({ normalMarginPct: e.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold">
          Margem alta (%)
          <input
            className={inputCls}
            value={form.premiumMarginPct}
            onChange={(e) => set({ premiumMarginPct: e.target.value })}
          />
        </label>
      </div>

      <button
        onClick={() =>
          save.mutate(
            {
              enabledSources: form.enabledSources.length ? form.enabledSources : sources.slice(0, 3),
              maxResults: Math.min(Math.max(numOrNull(form.maxResults) ?? 12, 1), 30),
              defaultShipping: parseToCents(form.defaultShipping) ?? 0,
              packagingCost: parseToCents(form.packagingCost) ?? 0,
              taxPct: numOrNull(form.taxPct) ?? 0,
              otherPct: numOrNull(form.otherPct) ?? 0,
              quickMarginPct: numOrNull(form.quickMarginPct) ?? 30,
              normalMarginPct: numOrNull(form.normalMarginPct) ?? 55,
              premiumMarginPct: numOrNull(form.premiumMarginPct) ?? 70,
            },
            { onSuccess: () => setDraft(null) },
          )
        }
        disabled={save.isPending}
        className="mt-5 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60"
      >
        {save.isPending ? "Salvando..." : "SALVAR CONFIGURAÇÕES"}
      </button>
      {save.isSuccess && !draft && (
        <p className="mt-2 text-xs font-semibold text-emerald-500">Configurações salvas.</p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        O custo real de cada oferta = preço de compra + frete + impostos + outros custos +
        embalagem. As margens definem os três cenários de revenda (margem sobre o preço de venda —
        margens acima de 70% deixam o preço muito alto).
      </p>
    </div>
  );
}

// ============================================================
// Aba principal
// ============================================================
export function DealHunterTab() {
  const [view, setView] = useState<"cacar" | "historico" | "alertas" | "config">("cacar");
  const [form, setForm] = useState<HuntForm>({
    query: "",
    category: "",
    maxBuyPrice: "",
    quantity: "1",
    minMarginPct: "",
    minSalePrice: "",
    minDiscountPct: "",
    sources: ["Mercado Livre", "Shopee", "Amazon"],
    sortBy: "oportunidade",
  });
  const [filters, setFilters] = useState<ResultFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<DealOfferDTO | null>(null);
  const [searchId, setSearchId] = useState<number | null>(null);

  const sources = useDealSources(true);
  const overview = useDealOverview(true);
  const hunt = useHuntDeals();
  const top = useTopDealOffers(searchId, searchId != null);
  const removeOffer = useDeleteDealOffer();

  const offers = useDealOffers(
    {
      searchId,
      sortBy: filters.sortBy as "oportunidade",
      store: filters.store || null,
      maxPrice: parseToCents(filters.maxPrice),
      minDiscountPct: numOrNull(filters.minDiscountPct),
      minMarginPct: numOrNull(filters.minMarginPct),
      minProfit: parseToCents(filters.minProfit),
      minScore: numOrNull(filters.minScore),
      onlyAvailable: filters.onlyAvailable,
      limit: 60,
    },
    searchId != null,
  );

  const sourceList = sources.data ?? ["Mercado Livre", "Shopee", "Amazon"];
  const result = hunt.data;
  const list = offers.data ?? [];
  const stores = useMemo(() => [...new Set(list.map((o) => o.store))], [list]);

  const runHunt = () => {
    hunt.mutate(
      {
        query: form.query.trim(),
        category: form.category || null,
        maxBuyPrice: parseToCents(form.maxBuyPrice),
        quantity: Math.max(1, numOrNull(form.quantity) ?? 1),
        minMarginPct: numOrNull(form.minMarginPct),
        minSalePrice: parseToCents(form.minSalePrice),
        minDiscountPct: numOrNull(form.minDiscountPct),
        sources: form.sources,
        sortBy: form.sortBy as "oportunidade",
      },
      { onSuccess: (r) => setSearchId(r.searchId) },
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="overline text-gold">Compras inteligentes</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold">CAÇADOR DE OFERTAS</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Descubra qual produto está barato AGORA e tem o maior potencial de lucro para a Rafa
            Laser revender. A IA pesquisa promoções reais, compara com o preço de mercado e calcula
            custo, lucro e margem — sem inventar número nenhum.
          </p>
        </div>
      </div>

      {/* Resumo */}
      {overview.data && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pesquisas feitas", value: String(overview.data.searches), icon: Search },
            { label: "Ofertas guardadas", value: String(overview.data.offers), icon: ShoppingBag },
            {
              label: "Melhor score",
              value: overview.data.bestScore != null ? String(overview.data.bestScore) : "—",
              icon: Flame,
            },
            {
              label: "Monitoramentos ativos",
              value: String(overview.data.activeAlerts),
              icon: Bell,
            },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <c.icon className="h-3.5 w-3.5" />
                <p className="text-[11px] uppercase tracking-wide">{c.label}</p>
              </div>
              <p className="mt-1 font-display text-xl font-extrabold">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Abas internas */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["cacar", "Caçar ofertas", Zap],
            ["historico", "Histórico", BarChart3],
            ["alertas", "Monitoramentos", Bell],
            ["config", "Configurações", Settings2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
              view === key ? "bg-foreground text-background" : "border border-border hover:border-gold"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {view === "cacar" ? (
          <div className="space-y-5">
            <SearchPanel
              form={form}
              setForm={setForm}
              sources={sourceList}
              onHunt={runHunt}
              loading={hunt.isPending}
            />

            {hunt.isError && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                A caçada falhou. Tente novamente em alguns instantes.
              </p>
            )}

            {result && (
              <div
                className={`rounded-xl border p-3 text-sm ${
                  result.ok
                    ? "border-border bg-muted/30"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                <p>{result.message}</p>
                {result.triggeredAlerts.length > 0 && (
                  <p className="mt-1 font-bold text-gold">
                    🚨 NOVA OFERTA ENCONTRADA para: {result.triggeredAlerts.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* TOP 10 */}
            {searchId != null && (top.data ?? []).length > 0 && (
              <div className="rounded-2xl border border-gold/50 bg-card p-5">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-gold" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-gold">
                    🔥 TOP 10 OFERTAS
                  </h3>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(top.data ?? []).map((o, i) => (
                    <OfferCard
                      key={o.id}
                      offer={o}
                      rank={i + 1}
                      onOpen={() => setSelected(o)}
                    />
                  ))}
                </div>
              </div>
            )}

            {searchId != null && (
              <>
                <FiltersBar filters={filters} setFilters={setFilters} stores={stores} />
                {offers.isLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando ofertas...
                  </p>
                ) : list.length === 0 ? (
                  <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                    Nenhuma oferta bate com esses filtros.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {list.map((o) => (
                      <div key={o.id} className="relative">
                        <OfferCard offer={o} onOpen={() => setSelected(o)} />
                        <button
                          onClick={() => removeOffer.mutate(o.id)}
                          className="absolute right-2 top-2 hidden rounded-full bg-black/70 p-1.5 text-white hover:bg-destructive sm:block"
                          aria-label="Descartar oferta"
                          title="Descartar oferta"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : view === "historico" ? (
          <HistoryPanel />
        ) : view === "alertas" ? (
          <AlertsPanel />
        ) : (
          <SettingsPanel sources={sourceList} />
        )}
      </div>

      {selected && <ResaleModal offer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
