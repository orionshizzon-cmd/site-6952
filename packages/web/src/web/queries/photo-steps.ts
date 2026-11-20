import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";

export function usePhotoSteps() {
  return useQuery(orpc.photoSteps.list.queryOptions({ staleTime: 60_000 }));
}

export function useAdminPhotoSteps(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "photoSteps"],
    queryFn: () => client.photoSteps.listAll(),
    enabled,
    staleTime: 10_000,
  });
}

function useInvalidatePhotoSteps() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin", "photoSteps"] });
    qc.invalidateQueries({ queryKey: orpc.photoSteps.list.key() });
  };
}

export function useSavePhotoStep() {
  const invalidate = useInvalidatePhotoSteps();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.photoSteps.create>[0] & { id?: number }) =>
      input.id != null
        ? client.photoSteps.update(input as Parameters<typeof client.photoSteps.update>[0])
        : client.photoSteps.create(input),
    onSuccess: invalidate,
  });
}

export function useDeletePhotoStep() {
  const invalidate = useInvalidatePhotoSteps();
  return useMutation({
    mutationFn: (id: number) => client.photoSteps.remove({ id }),
    onSuccess: invalidate,
  });
}
