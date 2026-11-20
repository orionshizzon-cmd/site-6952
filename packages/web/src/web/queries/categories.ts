import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";

export function useCategories() {
  return useQuery(orpc.categories.list.queryOptions({ staleTime: 60_000 }));
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: orpc.categories.list.key() });
  qc.invalidateQueries({ queryKey: ["admin", "products"] });
  qc.invalidateQueries({ queryKey: orpc.products.list.key() });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => client.categories.create({ name }),
    onSuccess: () => invalidate(qc),
  });
}

export function useRenameCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; name: string }) => client.categories.rename(input),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.categories.remove({ id }),
    onSuccess: () => invalidate(qc),
  });
}
