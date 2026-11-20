import type {
  CatalogMarketPrice,
  CatalogMath,
  CatalogProduct,
  CatalogSettings,
} from "../database/schema";

/** Configuração padrão de custos usada quando o admin ainda não salvou a dele. */
export const DEFAULT_SETTINGS: Omit<CatalogSettings, "id" | "updatedAt"> = {
  freightPct: 12,
  taxPct: 8,
  otherPct: 3,
  packagingCost: 150,
  marginPct: 60,
  markupPct: 0,
};

export type CostSettings = Omit<CatalogSettings, "id" | "updatedAt">;

function round(value: number): number {
  return Math.round(value);
}

/**
 * Custo real por unidade = preço do fornecedor + frete + impostos + outros + embalagem.
 * Tudo em centavos. Retorna null quando o catálogo não informou preço.
 */
export function realUnitCost(unitPrice: number | null, s: CostSettings): number | null {
  if (unitPrice == null) return null;
  const extras = (unitPrice * (s.freightPct + s.taxPct + s.otherPct)) / 100;
  return round(unitPrice + extras + s.packagingCost);
}

/** Preço sugerido de venda a partir da margem desejada (e markup extra, se houver). */
export function suggestedPrice(cost: number | null, s: CostSettings): number | null {
  if (cost == null) return null;
  const margin = Math.min(Math.max(s.marginPct, 0), 95);
  const base = cost / (1 - margin / 100);
  return round(base * (1 + Math.max(s.markupPct, 0) / 100));
}

/** Consolida os preços de mercado registrados (usa promocional quando existir). */
export function marketStats(sources: CatalogMarketPrice[]): {
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
} {
  const values = sources
    .filter((s) => s.matchType !== "diferente")
    .map((s) => s.promoPrice ?? s.price)
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (values.length === 0) return { min: null, max: null, avg: null, median: null };
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0 ? round((values[mid - 1] + values[mid]) / 2) : values[mid];
  return {
    min: values[0],
    max: values[values.length - 1],
    avg: round(sum / values.length),
    median,
  };
}

/**
 * Preço máximo recomendado de compra: quanto dá para pagar no fornecedor
 * mantendo a margem desejada em cima do preço de mercado representativo.
 */
export function maxBuyPrice(marketPrice: number | null, s: CostSettings): number | null {
  if (marketPrice == null) return null;
  const margin = Math.min(Math.max(s.marginPct, 0), 95);
  const targetCost = marketPrice * (1 - margin / 100);
  const extrasPct = (s.freightPct + s.taxPct + s.otherPct) / 100;
  const value = (targetCost - s.packagingCost) / (1 + extrasPct);
  return value > 0 ? round(value) : 0;
}

/** Todos os números derivados de um produto do catálogo. */
export function computeMath(
  p: Pick<CatalogProduct, "unitPrice" | "boxQty" | "boxPrice" | "marketAvg">,
  sources: CatalogMarketPrice[],
  s: CostSettings,
): CatalogMath {
  const unit = p.unitPrice ?? (p.boxPrice && p.boxQty ? round(p.boxPrice / p.boxQty) : null);
  const cost = realUnitCost(unit, s);
  const price = suggestedPrice(cost, s);
  const qty = p.boxQty ?? null;
  const stats = marketStats(sources);
  const market = stats.median ?? stats.avg ?? p.marketAvg ?? null;
  const max = maxBuyPrice(market, s);

  const grossProfit = price != null && cost != null ? price - cost : null;
  const marginPct =
    price != null && grossProfit != null && price > 0
      ? Math.round((grossProfit / price) * 100)
      : null;
  const investment = cost != null && qty != null ? cost * qty : (p.boxPrice ?? null);
  const potentialRevenue = price != null && qty != null ? price * qty : null;
  const potentialProfit =
    potentialRevenue != null && investment != null ? potentialRevenue - investment : null;

  // Oportunidade: mercado paga bem acima do custo real de aquisição
  let opportunityPct: number | null = null;
  if (market != null && cost != null && cost > 0) {
    opportunityPct = Math.round(((market - cost) / cost) * 100);
  }
  const isOpportunity = opportunityPct != null && opportunityPct >= 100;

  let marketVerdict: CatalogMath["marketVerdict"] = null;
  if (max != null && unit != null) {
    if (unit <= max * 0.9) marketVerdict = "abaixo";
    else if (unit <= max * 1.05) marketVerdict = "negociar";
    else marketVerdict = "acima";
  }

  return {
    realUnitCost: cost,
    suggestedPrice: price,
    grossProfit,
    marginPct,
    investment,
    potentialRevenue,
    potentialProfit,
    maxBuyPrice: max,
    marketVerdict,
    // Alerta quando o preço unitário é baixo mas a caixa exige investimento alto
    highInvestmentAlert: investment != null && investment >= 200000,
    isOpportunity,
    opportunityPct,
  };
}

const PERSONALIZABLE_POINTS: Record<string, number> = {
  excelente: 20,
  bom: 14,
  pouco: 6,
  nao: 0,
};

const GOOD_CATEGORIES = [
  "presente",
  "copo",
  "garrafa",
  "term",
  "caneca",
  "brinde",
  "acess",
  "eletr",
  "chaveiro",
  "escrit",
  "caneta",
  "pet",
  "casa",
  "cozinha",
];

/**
 * Pontuação de 0 a 100 explicável, calculada sempre da mesma forma:
 * preço de compra, margem, giro, investimento, quantidade mínima,
 * personalização e adequação ao público da Rafa Laser.
 */
export function scoreProduct(
  p: Pick<
    CatalogProduct,
    "unitPrice" | "boxQty" | "boxPrice" | "category" | "personalizable" | "material" | "name"
  >,
  math: CatalogMath,
): { score: number; recommendation: "comprar" | "testar" | "nao"; reason: string } {
  const reasons: string[] = [];
  let score = 0;

  // Preço de compra (0-20): quanto menor o custo unitário, melhor o giro
  const unit = p.unitPrice ?? (p.boxPrice && p.boxQty ? Math.round(p.boxPrice / p.boxQty) : null);
  if (unit == null) {
    score += 6;
    reasons.push("Preço não informado no catálogo — pontuação limitada.");
  } else if (unit <= 1500) {
    score += 20;
    reasons.push("Custo unitário baixo, fácil de vender e repor.");
  } else if (unit <= 4000) {
    score += 15;
    reasons.push("Custo unitário mediano.");
  } else if (unit <= 9000) {
    score += 9;
    reasons.push("Custo unitário alto, exige preço final maior.");
  } else {
    score += 4;
    reasons.push("Custo unitário muito alto para o público típico.");
  }

  // Margem potencial (0-20)
  if (math.marginPct == null) {
    score += 6;
  } else if (math.marginPct >= 60) {
    score += 20;
    reasons.push(`Margem projetada de ${math.marginPct}%.`);
  } else if (math.marginPct >= 45) {
    score += 15;
    reasons.push(`Margem projetada de ${math.marginPct}%.`);
  } else if (math.marginPct >= 30) {
    score += 9;
    reasons.push(`Margem apertada (${math.marginPct}%).`);
  } else {
    score += 3;
    reasons.push("Margem baixa depois dos custos.");
  }

  // Personalização (0-20)
  score += PERSONALIZABLE_POINTS[p.personalizable] ?? 6;
  if (p.personalizable === "excelente") reasons.push("Ótimo para gravação a laser.");
  if (p.personalizable === "nao") reasons.push("Não serve para personalização a laser.");

  // Investimento necessário (0-15)
  const inv = math.investment;
  if (inv == null) score += 7;
  else if (inv <= 30000) {
    score += 15;
    reasons.push("Investimento inicial baixo.");
  } else if (inv <= 100000) score += 11;
  else if (inv <= 250000) {
    score += 6;
    reasons.push("Investimento inicial considerável.");
  } else {
    score += 2;
    reasons.push("⚠️ Investimento total alto mesmo com preço unitário baixo.");
  }

  // Quantidade mínima / caixa (0-10)
  const qty = p.boxQty ?? null;
  if (qty == null) score += 5;
  else if (qty <= 12) {
    score += 10;
    reasons.push("Quantidade mínima pequena, dá para testar.");
  } else if (qty <= 50) score += 8;
  else if (qty <= 200) score += 5;
  else {
    score += 2;
    reasons.push("Quantidade mínima alta, risco de estoque parado.");
  }

  // Adequação ao público / giro (0-15)
  const haystack = `${p.category ?? ""} ${p.name} ${p.material ?? ""}`.toLowerCase();
  const fits = GOOD_CATEGORIES.filter((c) => haystack.includes(c)).length;
  if (fits >= 2) {
    score += 15;
    reasons.push("Encaixa no que a Rafa Laser já vende.");
  } else if (fits === 1) score += 10;
  else {
    score += 5;
    reasons.push("Fora das categorias mais fortes da loja.");
  }

  // Comparação com o mercado, quando houver preços validados
  if (math.marketVerdict === "abaixo") {
    score = Math.min(100, score + 5);
    reasons.push("Preço do fornecedor abaixo do máximo recomendado.");
  } else if (math.marketVerdict === "acima") {
    score = Math.max(0, score - 12);
    reasons.push("Preço do fornecedor acima do máximo recomendado — não comprar sem negociar.");
  }

  // Oportunidade forte: mercado paga muito mais que o custo real
  if (math.isOpportunity && math.opportunityPct != null) {
    score = Math.min(100, score + (math.opportunityPct >= 200 ? 8 : 5));
    reasons.push(
      `💰 Oportunidade: o mercado cobra ${math.opportunityPct}% acima do seu custo real.`,
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const recommendation = score >= 75 ? "comprar" : score >= 60 ? "testar" : "nao";
  return { score, recommendation, reason: reasons.join(" ") };
}

/** Faixa/etiqueta da pontuação, igual em toda a interface. */
export function scoreLabel(score: number): string {
  if (score >= 90) return "🔥 EXCELENTE OPORTUNIDADE";
  if (score >= 75) return "🟢 BOA OPORTUNIDADE";
  if (score >= 60) return "🟡 TESTAR / NEGOCIAR";
  if (score >= 40) return "🟠 BAIXA PRIORIDADE";
  return "🔴 NÃO RECOMENDADO";
}
