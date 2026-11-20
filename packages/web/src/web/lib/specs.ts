import type { ProductDTO } from "../../api/database/schema";

export type Spec = { label: string; value: string };

/**
 * Lê a ficha técnica do produto (campo `specs`), uma característica por linha
 * no formato "Nome: valor". Linhas sem ":" entram como característica solta
 * (label vazio) para não perder informação cadastrada pelo admin.
 */
export function parseSpecs(raw: string | null | undefined): Spec[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(":");
      if (at <= 0) return { label: "", value: line };
      return { label: line.slice(0, at).trim(), value: line.slice(at + 1).trim() };
    })
    .filter((s) => s.value.length > 0 || s.label.length > 0);
}

/**
 * Características para mostrar no cartão da vitrine. Usa a ficha técnica
 * quando existe e, quando não existe, monta a partir do que o produto já tem
 * (cores e personalização) — sem inventar dado que não está cadastrado.
 */
export function cardSpecs(product: ProductDTO, limit = 3): Spec[] {
  const fromSpecs = parseSpecs(product.specs).filter((s) => s.label && s.value);
  if (fromSpecs.length > 0) return fromSpecs.slice(0, limit);

  const fallback: Spec[] = [];
  const colors = product.colors ?? [];
  if (colors.length > 0) {
    fallback.push({
      label: "Cores",
      value: colors.length === 1 ? colors[0].name : `${colors.length} opções`,
    });
  }
  fallback.push({
    label: "Gravação",
    value: product.customizable === false ? "Sem gravação" : "Laser personalizada",
  });
  return fallback.slice(0, limit);
}
