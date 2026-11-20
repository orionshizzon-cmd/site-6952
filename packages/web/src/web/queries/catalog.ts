import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api";

const KEY = ["admin", "catalog"] as const;

function useInvalidateCatalog() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEY });
  };
}

// ----- Configuração de custos -----
export function useCatalogSettings(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "settings"],
    queryFn: () => client.catalog.settings(),
    enabled,
    staleTime: 30_000,
  });
}

export function useSaveCatalogSettings() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.catalog.saveSettings>[0]) =>
      client.catalog.saveSettings(input),
    onSuccess: invalidate,
  });
}

// ----- Catálogos enviados -----
export function useCatalogs(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "files"],
    queryFn: () => client.catalog.catalogs(),
    enabled,
    staleTime: 5_000,
    // Enquanto houver análise em andamento, acompanha o status automaticamente
    refetchInterval: (query) =>
      (query.state.data ?? []).some((f) => f.status === "analisando" || f.status === "pendente")
        ? 4_000
        : false,
  });
}

export function useCreateCatalog() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.catalog.createCatalog>[0]) =>
      client.catalog.createCatalog(input),
    onSuccess: invalidate,
  });
}

export function useReanalyzeCatalog() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: number) => client.catalog.reanalyze({ id }),
    onSuccess: invalidate,
  });
}

export function useDeleteCatalog() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: number) => client.catalog.deleteCatalog({ id }),
    onSuccess: invalidate,
  });
}

// ----- Produtos analisados -----
export function useCatalogProducts(catalogId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "products", catalogId],
    queryFn: () => client.catalog.products({ catalogId }),
    enabled,
    staleTime: 5_000,
  });
}

export function useUpdateCatalogProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.catalog.updateProduct>[0]) =>
      client.catalog.updateProduct(input),
    onSuccess: invalidate,
  });
}

export function useDeleteCatalogProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: number) => client.catalog.deleteProduct({ id }),
    onSuccess: invalidate,
  });
}

// ----- Preços de mercado (registro manual) -----
export function useAddMarketPrice() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.catalog.addMarketPrice>[0]) =>
      client.catalog.addMarketPrice(input),
    onSuccess: invalidate,
  });
}

export function useRemoveMarketPrice() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: number) => client.catalog.removeMarketPrice({ id }),
    onSuccess: invalidate,
  });
}

// ----- Busca automática de preços na internet -----
export function useSearchMarketPrices() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (productId: number) => client.catalog.searchPrices({ productId }),
    onSuccess: invalidate,
  });
}

// ----- Alertas de oportunidade -----
export function useCatalogOpportunities(catalogId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "opportunities", catalogId],
    queryFn: () => client.catalog.opportunities({ catalogId }),
    enabled,
    staleTime: 5_000,
  });
}

// ----- Cadastro de fornecedores -----
export function useSuppliers(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "supplier-records"],
    queryFn: () => client.catalog.suppliers(),
    enabled,
    staleTime: 10_000,
  });
}

export function useSaveSupplier() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.catalog.saveSupplier>[0]) =>
      client.catalog.saveSupplier(input),
    onSuccess: invalidate,
  });
}

export function useDeleteSupplier() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: number) => client.catalog.deleteSupplier({ id }),
    onSuccess: invalidate,
  });
}

// ----- Comparações -----
export function useCompareCatalogs(oldId: number | null, newId: number | null) {
  return useQuery({
    queryKey: [...KEY, "compare", oldId, newId],
    queryFn: () => client.catalog.compareCatalogs({ oldId: oldId!, newId: newId! }),
    enabled: oldId != null && newId != null && oldId !== newId,
    staleTime: 10_000,
  });
}

export function useCompareSuppliers(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "suppliers"],
    queryFn: () => client.catalog.compareSuppliers(),
    enabled,
    staleTime: 10_000,
  });
}

// ----- Relatório -----
export function useCatalogReport(catalogId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "report", catalogId],
    queryFn: () => client.catalog.report({ catalogId: catalogId! }),
    enabled: enabled && catalogId != null,
    staleTime: 10_000,
  });
}

// ----- Simulador de compra -----
export function useSimulateBuy() {
  return useMutation({
    mutationFn: (input: Parameters<typeof client.catalog.simulate>[0]) =>
      client.catalog.simulate(input),
  });
}

// ----- Enviar para o cadastro de Produtos -----
export function useAddCatalogProductToStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.catalog.addToProducts>[0]) =>
      client.catalog.addToProducts(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
  });
}
