import Constants from "expo-constants";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@template/web";
import { getToken } from "./session";

const baseUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL;

/** Base da API sem barra final — usada também nos uploads assinados. */
export const apiBaseUrl = String(baseUrl ?? "").replace(/\/+$/, "");

const link = new RPCLink({
  url: `${apiBaseUrl}/api/rpc`,
  // As procedures de admin exigem o token assinado no header Authorization.
  headers: () => {
    const token = getToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  },
});

/** Direct typed client: await client.ping() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.ping.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);
