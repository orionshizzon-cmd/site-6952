import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";

export const photoStepsKey = ["admin", "photo-steps"] as const;

type SaveInput = Parameters<typeof client.photoSteps.create>[0] & { id?: number };

/** Etapas da fotogravação mostradas na home, inclusive as escondidas. */
export function useAdminPhotoSteps() {
  return useQuery({
    queryKey: photoStepsKey,
    queryFn: () => client.photoSteps.listAll(),
    staleTime: 10_000,
  });
}

export function useSavePhotoStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInput) =>
      input.id != null
        ? client.photoSteps.update(input as Parameters<typeof client.photoSteps.update>[0])
        : client.photoSteps.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: photoStepsKey }),
  });
}

export function useDeletePhotoStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.photoSteps.remove({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: photoStepsKey }),
  });
}
