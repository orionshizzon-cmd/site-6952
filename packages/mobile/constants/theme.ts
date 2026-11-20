import { Platform } from "react-native";

/**
 * Tokens de cor do app admin Rafa Laser. Mesmo vocabulário do site
 * (`packages/web/src/web/styles.css`) para as duas plataformas combinarem:
 * off-white quente no claro, tinta quase preta no escuro, dourado metálico
 * como acento e verde do WhatsApp nos contatos.
 */
export const Colors = {
  light: {
    background: "#F6F5F2",
    foreground: "#0E0E0F",
    card: "#FFFFFF",
    cardForeground: "#0E0E0F",
    primary: "#0E0E0F",
    primaryForeground: "#FFFFFF",
    secondary: "#EFEDE8",
    secondaryForeground: "#0E0E0F",
    muted: "#EFEDE8",
    mutedForeground: "#6B6B6E",
    accent: "#C9A24B",
    accentForeground: "#141416",
    border: "#E4E2DC",
    destructive: "#B4242A",
    success: "#16A34A",
    warning: "#D97706",
    gold: "#C9A24B",
    goldSoft: "#E7CE8F",
    goldDeep: "#B8863B",
    whatsapp: "#25D366",
    ink: "#141416",
  },
  dark: {
    background: "#0B0B0C",
    foreground: "#F7F6F3",
    card: "#141416",
    cardForeground: "#F7F6F3",
    primary: "#F7F6F3",
    primaryForeground: "#0E0E0F",
    secondary: "#1D1D20",
    secondaryForeground: "#F7F6F3",
    accent: "#C9A24B",
    accentForeground: "#141416",
    muted: "#1D1D20",
    mutedForeground: "#9A9A9E",
    border: "#2A2A2E",
    destructive: "#EF4444",
    success: "#22C55E",
    warning: "#F59E0B",
    gold: "#C9A24B",
    goldSoft: "#E7CE8F",
    goldDeep: "#B8863B",
    whatsapp: "#25D366",
    ink: "#0B0B0C",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ColorScheme];

/**
 * Famílias tipográficas. Poppins é carregada em `app/_layout.tsx` com
 * `useFonts` (expo-font) e referenciada aqui.
 */
export const Fonts = {
  display: "Poppins_700Bold",
  semibold: "Poppins_600SemiBold",
  medium: "Poppins_500Medium",
  sans: "Poppins_400Regular",
  mono: Platform.select({
    ios: "ui-monospace",
    android: "monospace",
    default: "monospace",
  }) as string,
};
