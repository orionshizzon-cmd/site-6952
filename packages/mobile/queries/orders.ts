import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";

export const ordersKey = ["admin", "orders"] as const;

export function useAdminOrders() {
  return useQuery({
    queryKey: ordersKey,
    queryFn: () => client.orders.list(),
    staleTime: 5_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.orders.updateStatus>[0]) =>
      client.orders.updateStatus(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordersKey }),
  });
}

export function useDeleteOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => client.orders.remove({ ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordersKey }),
  });
}
