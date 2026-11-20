// Utilidades de dinheiro (BRL, valores em centavos)

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Formata centavos -> "R$ 1.234,56"
export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "Sob consulta";
  return fmt.format(cents / 100);
}

// Converte um texto digitado ("12,50", "R$ 12,50", "12.50") em centavos
export function parseToCents(input: string): number | null {
  if (!input) return null;
  const clean = input
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove separador de milhar
    .replace(",", ".");
  const value = Number(clean);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

// Formata centavos como valor simples "1234,56" (para inputs)
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
