import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";

export const portfolioKey = ["admin", "portfolio"] as const;

type SaveInput = Parameters<typeof client.portfolio.create>[0] & { id?: number };

/** Peças reais (portfólio), inclusive as inativas. */
export function useAdminPortfolio() {
  return useQuery({
    queryKey: portfolioKey,
    queryFn: () => client.portfolio.listAll(),
    staleTime: 10_000,
  });
}

export function useSavePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInput) =>
      input.id != null
        ? client.portfolio.update(input as Parameters<typeof client.portfolio.update>[0])
        : client.portfolio.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: portfolioKey }),
  });
}

export function useDeletePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.portfolio.remove({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: portfolioKey }),
  });
}

/** Reordena a galeria conforme a nova sequência de ids. */
export function useReorderPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => client.portfolio.reorder({ ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: portfolioKey }),
  });
}
