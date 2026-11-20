/** Formata centavos em reais: 12900 → "R$ 129,00". Null = "Sob consulta". */
export function money(cents?: number | null): string {
  if (cents === null || cents === undefined) return "Sob consulta";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/** Converte o que o usuário digitou ("129,90") em centavos. Vazio → null. */
export function inputToCents(value: string): number | null {
  const clean = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!clean.trim()) return null;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

/** Centavos → texto editável no campo ("129,00"). */
export function centsToInput(cents?: number | null): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Data curta pt-BR: 25/09/2026 14:30. */
export function dateTime(value: Date | string | number | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Slug a partir do nome do produto. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    // remove acentos (faixa de diacríticos combinantes)
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/** Mensagem legível de um erro vindo da API. */
export function errorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  const maybe = error as { message?: string };
  return maybe.message || fallback;
}
