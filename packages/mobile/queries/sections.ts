import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";

export const sectionsKey = ["admin", "sections"] as const;

type SaveInput = Parameters<typeof client.sections.create>[0] & { id?: number };

/** Seções da home, inclusive as escondidas. */
export function useAdminSections() {
  return useQuery({
    queryKey: sectionsKey,
    queryFn: () => client.sections.listAll(),
    staleTime: 10_000,
  });
}

export function useSaveSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInput) =>
      input.id != null
        ? client.sections.update(input as Parameters<typeof client.sections.update>[0])
        : client.sections.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectionsKey }),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.sections.remove({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectionsKey }),
  });
}
