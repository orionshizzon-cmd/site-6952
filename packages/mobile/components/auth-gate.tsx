import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { apiBaseUrl } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { Button, ErrorNote, Field, Loading, Screen } from "./ui";

/**
 * Mostra a tela de login enquanto não há sessão de admin válida e libera o
 * app (navegação em pilha) depois que o token é aceito pela API.
 */
export function AuthGate({ ready, children }: { ready: boolean; children: React.ReactNode }) {
  const { status } = useAuth();
  const colors = useColors();

  if (!ready || status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center" }}>
        <Loading label="Carregando painel..." />
      </View>
    );
  }

  if (status === "signedOut") return <LoginScreen />;

  return <>{children}</>;
}

function LoginScreen() {
  const colors = useColors();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      setError("Informe usuário e senha.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(errorMessage(err, "Não foi possível entrar. Verifique usuário e senha."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 22 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", gap: 14 }}>
          <Image
            source={{ uri: `${apiBaseUrl}/images/logo-black.png` }}
            style={{ width: 96, height: 96, opacity: 0.9 }}
            resizeMode="contain"
          />
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text
              style={{
                fontFamily: Fonts.display,
                fontSize: 26,
                letterSpacing: -0.6,
                color: colors.foreground,
              }}
            >
              Painel Rafa Laser
            </Text>
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 13,
                color: colors.mutedForeground,
                textAlign: "center",
              }}
            >
              Administre produtos, pedidos e a vitrine do site direto do celular.
            </Text>
          </View>
        </View>

        <View style={{ gap: 14 }}>
          <Field
            label="Usuário"
            value={username}
            onChangeText={setUsername}
            placeholder="seu usuário"
            autoCapitalize="none"
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="sua senha"
            secureTextEntry
            autoCapitalize="none"
          />
          <ErrorNote message={error} />
          <Button label="Entrar" variant="gold" icon="lock-open" onPress={submit} loading={busy} />
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 11.5,
              color: colors.mutedForeground,
              textAlign: "center",
            }}
          >
            Use o mesmo usuário e senha do painel do site. A sessão fica salva neste aparelho.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
