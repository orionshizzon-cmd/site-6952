import type { DealScenario, DealSettings } from "../database/schema";

/** Configuração padrão do Caçador de Ofertas (usada antes do admin salvar a dele). */
export const DEFAULT_DEAL_SETTINGS: Omit<DealSettings, "id" | "updatedAt"> = {
  enabledSources: ["Mercado Livre", "Shopee", "Amazon"],
  maxResults: 12,
  defaultShipping: 0,
  packagingCost: 150,
  taxPct: 0,
  otherPct: 0,
  quickMarginPct: 30,
  normalMarginPct: 55,
  premiumMarginPct: 70,
};

export type DealCosts = Omit<DealSettings, "id" | "updatedAt">;

function round(v: number): number {
  return Math.round(v);
}

/**
 * Custo real por unidade = preço de compra + frete + impostos + outros + embalagem.
 * Tudo em centavos. Quando a oferta não informou frete, usa o frete padrão do admin.
 */
export function realCost(
  currentPrice: number,
  shippingCost: number | null,
  s: DealCosts,
): number {
  const freight = shippingCost ?? s.defaultShipping;
  const extras = (currentPrice * (s.taxPct + s.otherPct)) / 100;
  return round(currentPrice + freight + extras + s.packagingCost);
}

/** Preço de venda que entrega a margem pedida sobre o custo real. */
export function priceForMargin(cost: number, marginPct: number): number {
  const m = Math.min(Math.max(marginPct, 0), 95);
  return round(cost / (1 - m / 100));
}

/** Margem (%) de um preço de venda sobre o custo real. */
export function marginOf(cost: number, price: number): number | null {
  if (!price || price <= 0) return null;
  return round(((price - cost) / price) * 100);
}

/** Os três cenários de revenda: venda rápida, normal (recomendada) e margem alta. */
export function scenarios(cost: number, s: DealCosts): DealScenario[] {
  const defs: Array<{ key: DealScenario["key"]; label: string; margin: number }> = [
    { key: "rapida", label: "Venda rápida", margin: s.quickMarginPct },
    { key: "normal", label: "Venda normal (recomendada)", margin: s.normalMarginPct },
    { key: "premium", label: "Margem alta", margin: s.premiumMarginPct },
  ];
  return defs.map((d) => {
    const price = priceForMargin(cost, d.margin);
    return {
      key: d.key,
      label: d.label,
      price,
      profit: price - cost,
      marginPct: marginOf(cost, price) ?? 0,
    };
  });
}

export type DealAnalysisInput = {
  currentPrice: number;
  previousPrice: number | null;
  discountPct: number | null;
  shippingCost: number | null;
  marketAvg: number | null;
  quantityAvailable: number | null;
  availability: string | null;
  sellerRating: string | null;
};

export type DealAnalysis = {
  realCost: number;
  suggestedPrice: number;
  estProfit: number;
  estMarginPct: number | null;
  /** Desconto confiável: recalculado sobre o preço anterior quando existir. */
  discountPct: number | null;
  score: number;
  insufficientData: boolean;
  fakeDiscount: boolean;
  warnings: string[];
  scenarios: DealScenario[];
};

/**
 * Analisa uma oferta encontrada: custo real, revenda, score 0–100 e alertas.
 * Nunca inventa número — o que falta vira aviso e derruba a confiança do score.
 */
export function analyzeDeal(input: DealAnalysisInput, s: DealCosts): DealAnalysis {
  const warnings: string[] = [];
  const cost = realCost(input.currentPrice, input.shippingCost, s);
  const sc = scenarios(cost, s);
  const normal = sc.find((x) => x.key === "normal")!;

  // Preço sugerido: o menor entre a margem normal e o preço de mercado
  // (não adianta pedir mais caro do que o mercado já cobra).
  const suggested =
    input.marketAvg != null && input.marketAvg > cost
      ? Math.min(normal.price, input.marketAvg)
      : normal.price;
  const profit = suggested - cost;
  const margin = marginOf(cost, suggested);

  // ---- Desconto real ----
  let discount: number | null = null;
  if (input.previousPrice != null && input.previousPrice > input.currentPrice) {
    discount = round(((input.previousPrice - input.currentPrice) / input.previousPrice) * 100);
  } else if (input.discountPct != null) {
    discount = input.discountPct;
  }

  // ---- Falso desconto ----
  let fakeDiscount = false;
  if (
    discount != null &&
    discount >= 20 &&
    input.marketAvg != null &&
    input.currentPrice >= input.marketAvg * 0.97
  ) {
    fakeDiscount = true;
    warnings.push(
      "Possível falso desconto: mesmo com o desconto anunciado, o preço está igual ou acima da média de mercado.",
    );
  }
  if (
    input.previousPrice != null &&
    input.marketAvg != null &&
    input.previousPrice > input.marketAvg * 1.6
  ) {
    fakeDiscount = true;
    warnings.push("O 'preço anterior' do anúncio está muito acima do mercado — desconto inflado.");
  }

  // ---- Dados faltando ----
  const missing: string[] = [];
  if (input.marketAvg == null) missing.push("preço médio de mercado");
  if (input.previousPrice == null && input.discountPct == null) missing.push("preço anterior");
  if (input.shippingCost == null) missing.push("frete");
  if (input.quantityAvailable == null && !input.availability) missing.push("disponibilidade");
  const insufficientData = missing.length >= 2;
  if (missing.length)
    warnings.push(`Dados não informados pelo anúncio: ${missing.join(", ")}.`);
  if (input.shippingCost == null && s.defaultShipping > 0)
    warnings.push("Frete não informado — usei o frete padrão configurado nas opções.");

  // ---- Score 0–100 ----
  // 1) Desconto (0–18)
  let score = 0;
  if (discount != null) score += Math.min(discount, 60) * 0.3;
  // 2) Diferença compra × mercado (0–30)
  if (input.marketAvg != null && input.marketAvg > 0) {
    const gap = ((input.marketAvg - cost) / input.marketAvg) * 100;
    score += Math.max(Math.min(gap, 60), -20) * 0.5;
  }
  // 3) Potencial de lucro absoluto (0–15)
  if (profit > 0) score += Math.min(profit / 100 / 40, 1) * 15;
  // 4) Margem (0–22)
  if (margin != null) score += Math.max(Math.min(margin, 70), 0) * (22 / 70);
  // 5) Reputação / qualidade da oferta (0–8)
  if (input.sellerRating) score += 8;
  else if (!fakeDiscount) score += 4;
  // 6) Disponibilidade (0–7)
  if (input.quantityAvailable != null && input.quantityAvailable > 0)
    score += input.quantityAvailable >= 10 ? 7 : 4;
  else if (input.availability) score += 4;
  // 7) Custo de frete (0–5, penaliza frete alto)
  const freight = input.shippingCost ?? s.defaultShipping;
  const freightShare = freight / Math.max(input.currentPrice, 1);
  score += freightShare <= 0.05 ? 5 : freightShare <= 0.15 ? 3 : freightShare <= 0.3 ? 1 : 0;

  // Penalidades
  if (fakeDiscount) score -= 25;
  if (insufficientData) score -= 12;
  if (profit <= 0) score = Math.min(score, 25);

  return {
    realCost: cost,
    suggestedPrice: suggested,
    estProfit: profit,
    estMarginPct: margin,
    discountPct: discount,
    score: Math.max(0, Math.min(100, round(score))),
    insufficientData,
    fakeDiscount,
    warnings,
    scenarios: sc,
  };
}

/** Faixa do score conforme as regras do Caçador de Ofertas. */
export function dealScoreLabel(score: number): { emoji: string; label: string } {
  if (score >= 90) return { emoji: "🔥", label: "EXCELENTE" };
  if (score >= 75) return { emoji: "🟢", label: "ÓTIMA" };
  if (score >= 60) return { emoji: "🟡", label: "BOA" };
  if (score >= 40) return { emoji: "⚪", label: "MODERADA" };
  return { emoji: "🔴", label: "NÃO RECOMENDADO" };
}
