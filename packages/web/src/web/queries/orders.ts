import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";

export function useCreateOrder() {
  return useMutation(orpc.orders.create.mutationOptions());
}

// ----- Admin -----
export function useAdminOrders(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => client.orders.list(),
    enabled,
    staleTime: 5_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.orders.updateStatus>[0]) =>
      client.orders.updateStatus(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}

export function useDeleteOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => client.orders.remove({ ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}
