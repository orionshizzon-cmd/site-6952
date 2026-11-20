import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { adminBase, checkCredentials, issueToken } from "../lib/admin-auth";

export const admin = {
  // Login do administrador — retorna um token assinado (7 dias)
  login: base
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .handler(async ({ input }) => {
      if (!checkCredentials(input.username, input.password)) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Usuário ou senha inválidos.",
        });
      }
      return { token: issueToken() };
    }),

  // Verifica se o token atual ainda é válido (usado ao carregar o painel)
  me: adminBase.handler(async () => ({ ok: true as const })),
};
