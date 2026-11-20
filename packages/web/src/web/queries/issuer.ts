import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api";

export function useIssuer(enabled = true) {
  return useQuery({
    queryKey: ["admin", "issuer"],
    queryFn: () => client.issuer.get(),
    enabled,
    staleTime: 60_000,
  });
}

export function useSaveIssuer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.issuer.update>[0]) =>
      client.issuer.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "issuer"] }),
  });
}
