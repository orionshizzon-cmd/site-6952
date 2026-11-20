import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api";

const KEY = ["admin", "deal-hunter"] as const;

function useInvalidateDeals() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEY });
  };
}

// ----- Configurações -----
export function useDealSources(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "sources"],
    queryFn: () => client.dealHunter.sources(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useDealSettings(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "settings"],
    queryFn: () => client.dealHunter.settings(),
    enabled,
    staleTime: 30_000,
  });
}

export function useSaveDealSettings() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.dealHunter.saveSettings>[0]) =>
      client.dealHunter.saveSettings(input),
    onSuccess: invalidate,
  });
}

// ----- Caçada -----
export function useHuntDeals() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.dealHunter.hunt>[0]) =>
      client.dealHunter.hunt(input),
    onSuccess: invalidate,
  });
}

export function useDealOffers(
  input: Parameters<typeof client.dealHunter.offers>[0],
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...KEY, "offers", input],
    queryFn: () => client.dealHunter.offers(input),
    enabled,
    staleTime: 10_000,
  });
}

export function useTopDealOffers(searchId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "top", searchId],
    queryFn: () => client.dealHunter.topOffers({ searchId }),
    enabled,
    staleTime: 10_000,
  });
}

export function useDeleteDealOffer() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (id: number) => client.dealHunter.deleteOffer({ id }),
    onSuccess: invalidate,
  });
}

// ----- Histórico -----
export function useDealSearches(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "searches"],
    queryFn: () => client.dealHunter.searches({ limit: 40 }),
    enabled,
    staleTime: 10_000,
  });
}

export function useDeleteDealSearch() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (id: number) => client.dealHunter.deleteSearch({ id }),
    onSuccess: invalidate,
  });
}

export function useDealPriceHistory(query: string, enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "price-history", query],
    queryFn: () => client.dealHunter.priceHistory({ query }),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 10_000,
  });
}

// ----- Revenda -----
export function useAnalyzeForResale() {
  return useMutation({
    mutationFn: (input: Parameters<typeof client.dealHunter.analyzeForResale>[0]) =>
      client.dealHunter.analyzeForResale(input),
  });
}

// ----- Monitoramentos -----
export function useDealAlerts(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "alerts"],
    queryFn: () => client.dealHunter.alerts(),
    enabled,
    staleTime: 15_000,
  });
}

export function useSaveDealAlert() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.dealHunter.saveAlert>[0]) =>
      client.dealHunter.saveAlert(input),
    onSuccess: invalidate,
  });
}

export function useDeleteDealAlert() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (id: number) => client.dealHunter.deleteAlert({ id }),
    onSuccess: invalidate,
  });
}

export function useDealAlertHits(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "alert-hits"],
    queryFn: () => client.dealHunter.alertHits(),
    enabled,
    staleTime: 15_000,
  });
}

// ----- Resumo -----
export function useDealOverview(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "overview"],
    queryFn: () => client.dealHunter.overview(),
    enabled,
    staleTime: 15_000,
  });
}
