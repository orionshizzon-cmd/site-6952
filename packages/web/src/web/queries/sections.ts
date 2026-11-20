import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";

export function useSections() {
  return useQuery(orpc.sections.list.queryOptions({ staleTime: 60_000 }));
}

export function useAdminSections(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "sections"],
    queryFn: () => client.sections.listAll(),
    enabled,
    staleTime: 10_000,
  });
}

function useInvalidateSections() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin", "sections"] });
    qc.invalidateQueries({ queryKey: orpc.sections.list.key() });
  };
}

export function useSaveSection() {
  const invalidate = useInvalidateSections();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.sections.create>[0] & { id?: number }) =>
      input.id != null
        ? client.sections.update(input as Parameters<typeof client.sections.update>[0])
        : client.sections.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteSection() {
  const invalidate = useInvalidateSections();
  return useMutation({
    mutationFn: (id: number) => client.sections.remove({ id }),
    onSuccess: invalidate,
  });
}
