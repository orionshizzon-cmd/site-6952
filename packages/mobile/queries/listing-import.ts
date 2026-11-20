import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";
import { productsKey } from "./products";

export const listingImportKey = ["admin", "listing-import"] as const;

type DraftInput = Parameters<typeof client.listingImport.updateDraft>[0];
type ApproveInput = Parameters<typeof client.listingImport.approve>[0];

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: listingImportKey });
    qc.invalidateQueries({ queryKey: productsKey });
  };
}

/** Rascunhos de anúncios copiados da internet (pendentes, com erro e aprovados). */
export function useImportedListings() {
  return useQuery({
    queryKey: listingImportKey,
    queryFn: () => client.listingImport.list(),
    staleTime: 5_000,
  });
}

/** Copia um anúncio pela URL (a IA lê a página e baixa as fotos — leva 10 a 40 s). */
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
    mutationFn: (input: DraftInput) => client.listingImport.updateDraft(input),
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

/** Aprova o rascunho e cadastra o produto no catálogo. */
export function useApproveListing() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ApproveInput) => client.listingImport.approve(input),
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
