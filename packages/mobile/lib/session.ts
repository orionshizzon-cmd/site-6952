import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "rafa_admin_token";

// Token em memória — lido de forma síncrona pelo client oRPC a cada requisição.
let current: string | null = null;

/** Token do admin carregado nesta sessão (null = deslogado). */
export function getToken(): string | null {
  return current;
}

/**
 * Lê o token guardado no aparelho. SecureStore no Android/iOS e
 * localStorage no preview web (SecureStore não existe no navegador).
 */
export async function loadToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      current = globalThis.localStorage?.getItem(KEY) ?? null;
    } else {
      current = await SecureStore.getItemAsync(KEY);
    }
  } catch {
    current = null;
  }
  return current;
}

/** Guarda (ou apaga, com null) o token no aparelho e em memória. */
export async function saveToken(token: string | null): Promise<void> {
  current = token;
  try {
    if (Platform.OS === "web") {
      if (token) globalThis.localStorage?.setItem(KEY, token);
      else globalThis.localStorage?.removeItem(KEY);
      return;
    }
    if (token) await SecureStore.setItemAsync(KEY, token);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Sem armazenamento disponível: segue só com o token em memória.
  }
}
