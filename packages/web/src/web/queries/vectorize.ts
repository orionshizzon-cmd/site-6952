import { useMutation } from "@tanstack/react-query";
import { client } from "../lib/api";

// Gera a arte vetorizada (IA) a partir das imagens enviadas pelo admin
export function useVectorize() {
  return useMutation({
    mutationFn: (input: { mode: "compose" | "engrave"; imageKeys: string[] }) =>
      client.vectorize.generate(input),
  });
}
