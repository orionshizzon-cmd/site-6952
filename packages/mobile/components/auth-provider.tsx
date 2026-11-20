import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api";
import { getToken, loadToken, saveToken } from "@/lib/session";

type Status = "loading" | "signedIn" | "signedOut";

type AuthValue = {
  status: Status;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Sessão do administrador: carrega o token guardado no aparelho, valida com
 * `admin.me` e mantém o app logado entre aberturas.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await loadToken();
      if (!token) {
        if (alive) setStatus("signedOut");
        return;
      }
      try {
        await client.admin.me();
        if (alive) setStatus("signedIn");
      } catch {
        await saveToken(null);
        if (alive) setStatus("signedOut");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const { token } = await client.admin.login({ username, password });
      await saveToken(token);
      await queryClient.invalidateQueries();
      setStatus("signedIn");
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await saveToken(null);
    queryClient.clear();
    setStatus("signedOut");
  }, [queryClient]);

  const value = useMemo<AuthValue>(() => ({ status, signIn, signOut }), [status, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}

/** Token atual, para telas que precisam montar URLs autenticadas. */
export function useAdminToken(): string | null {
  return getToken();
}
