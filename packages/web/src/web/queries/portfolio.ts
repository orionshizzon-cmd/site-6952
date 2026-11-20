import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";

export function usePortfolio() {
  return useQuery(orpc.portfolio.list.queryOptions({ staleTime: 60_000 }));
}

// ----- Admin -----
export function useAdminPortfolio(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "portfolio"],
    queryFn: () => client.portfolio.listAll(),
    enabled,
    staleTime: 10_000,
  });
}

function useInvalidatePortfolio() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin", "portfolio"] });
    qc.invalidateQueries({ queryKey: orpc.portfolio.list.key() });
  };
}

export function useSavePortfolioItem() {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.portfolio.create>[0] & { id?: number }) =>
      input.id != null
        ? client.portfolio.update(input as Parameters<typeof client.portfolio.update>[0])
        : client.portfolio.create(input),
    onSuccess: invalidate,
  });
}

export function useDeletePortfolioItem() {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (id: number) => client.portfolio.remove({ id }),
    onSuccess: invalidate,
  });
}
