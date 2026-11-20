import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";

export const productsKey = ["admin", "products"] as const;

/** Todos os produtos, inclusive inativos (visão do admin). */
export function useAdminProducts() {
  return useQuery({
    queryKey: productsKey,
    queryFn: () => client.products.listAll(),
    staleTime: 10_000,
  });
}

type CreateInput = Parameters<typeof client.products.create>[0];

/** Cria (sem id) ou atualiza (com id) um produto. */
export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInput & { id?: number }) =>
      input.id != null
        ? client.products.update(input as Parameters<typeof client.products.update>[0])
        : client.products.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}

/** Alterações rápidas da lista: estoque, ativo, destaque, preço. */
export function usePatchProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.products.update>[0]) =>
      client.products.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.products.remove({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
  });
}
