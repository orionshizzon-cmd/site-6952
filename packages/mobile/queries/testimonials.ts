import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";

export const testimonialsKey = ["admin", "testimonials"] as const;

type SaveInput = Parameters<typeof client.testimonials.create>[0] & { id?: number };

/** Depoimentos, inclusive os escondidos. */
export function useAdminTestimonials() {
  return useQuery({
    queryKey: testimonialsKey,
    queryFn: () => client.testimonials.listAll(),
    staleTime: 10_000,
  });
}

export function useSaveTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInput) =>
      input.id != null
        ? client.testimonials.update(input as Parameters<typeof client.testimonials.update>[0])
        : client.testimonials.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: testimonialsKey }),
  });
}

export function useDeleteTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.testimonials.remove({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: testimonialsKey }),
  });
}
