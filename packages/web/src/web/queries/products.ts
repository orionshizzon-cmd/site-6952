import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";

export function useProducts() {
  return useQuery(orpc.products.list.queryOptions({ staleTime: 60_000 }));
}

// ----- Admin -----
export function useAdminProducts(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => client.products.listAll(),
    enabled,
    staleTime: 10_000,
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.products.create>[0] & { id?: number }) =>
      input.id != null
        ? client.products.update(input as Parameters<typeof client.products.update>[0])
        : client.products.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: orpc.products.list.key() });
    },
  });
}

/** Ajuste rápido de estoque a partir da lista do admin. */
export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; stock: number | null }) =>
      client.products.update({ id: input.id, stock: input.stock }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: orpc.products.list.key() });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.products.remove({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: orpc.products.list.key() });
    },
  });
}
