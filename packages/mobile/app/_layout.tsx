// System-managed layout — extend in place, never rewrite from scratch.
// Keep the provider chain intact: ErrorBoundary → OneDollarStats → SafeArea → QueryClient.
// To switch navigation, replace only the <Slot /> line with <Stack /> or <Tabs />.
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OneDollarStatsProvider } from "../lib/__analytics";
import { isWeb, startWebSafeArea } from "../lib/__web-safe-area";
import { AuthProvider } from "../components/auth-provider";
import { AuthGate } from "../components/auth-gate";
import appJson from "../app.json";

const queryClient = new QueryClient();

const applicationId = appJson.expo.extra.applicationId ?? "";
const hostname = applicationId ? `${applicationId}-mobile` : "localhost";

export default function RootLayout() {
  useEffect(() => {
    if (isWeb) startWebSafeArea();
  }, []);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  return (
    <ErrorBoundary>
      {/* Runable analytics provider — do not remove, required for analytics tracking */}
      <OneDollarStatsProvider
        config={{
          hostname,
          collectorUrl: "https://r.lilstts.com/events",
          devmode: true,
        }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="auto" />
            <AuthProvider>
              <AuthGate ready={fontsLoaded}>
                <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
              </AuthGate>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </OneDollarStatsProvider>
    </ErrorBoundary>
  );
}
