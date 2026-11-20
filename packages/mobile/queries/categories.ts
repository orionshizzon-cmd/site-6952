import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";
import { productsKey } from "./products";

export const categoriesKey = ["admin", "categories"] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: () => client.categories.list(),
    staleTime: 30_000,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: categoriesKey });
    qc.invalidateQueries({ queryKey: productsKey });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (name: string) => client.categories.create({ name }),
    onSuccess: invalidate,
  });
}

export function useRenameCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { id: number; name: string }) => client.categories.rename(input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => client.categories.remove({ id }),
    onSuccess: invalidate,
  });
}
