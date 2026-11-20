import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api";

const KEY = ["admin", "listing-import"] as const;

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };
}

/** Rascunhos de anúncios copiados da internet. */
export function useImportedListings(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "list"],
    queryFn: () => client.listingImport.list(),
    enabled,
    staleTime: 5_000,
  });
}

/** Copia um anúncio a partir da URL. */
export function useImportListingUrl() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (url: string) => client.listingImport.importUrl({ url }),
    onSuccess: invalidate,
  });
}

export function useUpdateListingDraft() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.listingImport.updateDraft>[0]) =>
      client.listingImport.updateDraft(input),
    onSuccess: invalidate,
  });
}

/** "Gerar anúncio Rafa Laser": reescreve o texto do rascunho com IA. */
export function useRewriteListing() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => client.listingImport.rewrite({ id }),
    onSuccess: invalidate,
  });
}

export function useAddListingImage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { id: number; key: string }) => client.listingImport.addImage(input),
    onSuccess: invalidate,
  });
}

export function useRemoveListingImage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { id: number; index: number }) => client.listingImport.removeImage(input),
    onSuccess: invalidate,
  });
}

/** Aprova o rascunho e cadastra o produto. */
export function useApproveListing() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.listingImport.approve>[0]) =>
      client.listingImport.approve(input),
    onSuccess: invalidate,
  });
}

export function useRemoveListing() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => client.listingImport.remove({ id }),
    onSuccess: invalidate,
  });
}
