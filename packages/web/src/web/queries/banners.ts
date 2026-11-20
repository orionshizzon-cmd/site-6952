import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";

export function useBanners() {
  return useQuery(orpc.banners.list.queryOptions({ staleTime: 60_000 }));
}

// ----- Admin -----
export function useAdminBanners(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "banners"],
    queryFn: () => client.banners.listAll(),
    enabled,
    staleTime: 10_000,
  });
}

function useInvalidateBanners() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin", "banners"] });
    qc.invalidateQueries({ queryKey: orpc.banners.list.key() });
  };
}

export function useSaveBanner() {
  const invalidate = useInvalidateBanners();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.banners.create>[0] & { id?: number }) =>
      input.id != null
        ? client.banners.update(input as Parameters<typeof client.banners.update>[0])
        : client.banners.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteBanner() {
  const invalidate = useInvalidateBanners();
  return useMutation({
    mutationFn: (id: number) => client.banners.remove({ id }),
    onSuccess: invalidate,
  });
}
