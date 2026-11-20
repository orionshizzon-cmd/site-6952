import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";

export const bannersKey = ["admin", "banners"] as const;

type SaveInput = Parameters<typeof client.banners.create>[0] & { id?: number };

/** Todos os banners, inclusive os inativos (visão do admin). */
export function useAdminBanners() {
  return useQuery({
    queryKey: bannersKey,
    queryFn: () => client.banners.listAll(),
    staleTime: 10_000,
  });
}

export function useSaveBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInput) =>
      input.id != null
        ? client.banners.update(input as Parameters<typeof client.banners.update>[0])
        : client.banners.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: bannersKey }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.banners.remove({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: bannersKey }),
  });
}
