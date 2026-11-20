import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";

export function useTestimonials() {
  return useQuery(orpc.testimonials.list.queryOptions({ staleTime: 60_000 }));
}

// ----- Admin -----
export function useAdminTestimonials(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "testimonials"],
    queryFn: () => client.testimonials.listAll(),
    enabled,
    staleTime: 10_000,
  });
}

function useInvalidateTestimonials() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
    qc.invalidateQueries({ queryKey: orpc.testimonials.list.key() });
  };
}

export function useSaveTestimonial() {
  const invalidate = useInvalidateTestimonials();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.testimonials.create>[0] & { id?: number }) =>
      input.id != null
        ? client.testimonials.update(input as Parameters<typeof client.testimonials.update>[0])
        : client.testimonials.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteTestimonial() {
  const invalidate = useInvalidateTestimonials();
  return useMutation({
    mutationFn: (id: number) => client.testimonials.remove({ id }),
    onSuccess: invalidate,
  });
}
