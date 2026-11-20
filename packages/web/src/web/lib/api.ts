import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "../../api";

export const ADMIN_TOKEN_KEY = "rafa-admin-token";

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export const STUDIO_TOKEN_KEY = "rafa-studio-token";

export function getStudioToken(): string | null {
  try {
    return localStorage.getItem(STUDIO_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStudioToken(token: string | null) {
  try {
    if (token) localStorage.setItem(STUDIO_TOKEN_KEY, token);
    else localStorage.removeItem(STUDIO_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`,
  // Envia o token do admin (quando existir) em toda chamada protegida
  headers: () => {
    const headers: Record<string, string> = {};
    const admin = getAdminToken();
    if (admin) headers.authorization = `Bearer ${admin}`;
    // Sessão do Rafa Laser Studio (/rafa) — header próprio, separado do admin
    const studio = getStudioToken();
    if (studio) headers["x-studio-token"] = studio;
    return headers;
  },
});

/** Direct typed client: await client.ping() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.ping.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);
