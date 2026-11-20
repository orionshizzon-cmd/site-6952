import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";

/** Tela base: safe area, fundo da marca e teclado que não cobre os campos. */
export function Screen({
  children,
  edges = ["top", "left", "right"],
}: {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  const colors = useColors();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Cabeçalho de tela com título, subtítulo e ação opcional à direita. */
export function Header({
  title,
  subtitle,
  right,
  back,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      {back ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: Fonts.display,
            fontSize: 21,
            letterSpacing: -0.4,
            color: colors.foreground,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 12.5,
              marginTop: 2,
              color: colors.mutedForeground,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Rótulo em caixa alta com tracking — mesma linguagem do site. */
export function Overline({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text
      style={{
        fontFamily: Fonts.semibold,
        fontSize: 10.5,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        color: colors.gold,
      }}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const colors = useColors();
  const body = (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      {body}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "gold" | "outline" | "ghost" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground, border: colors.primary },
    gold: { bg: colors.gold, fg: colors.accentForeground, border: colors.gold },
    outline: { bg: "transparent", fg: colors.foreground, border: colors.border },
    ghost: { bg: "transparent", fg: colors.mutedForeground, border: "transparent" },
    danger: { bg: "transparent", fg: colors.destructive, border: colors.destructive },
  };
  const tone = palette[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 13,
          paddingHorizontal: 18,
          borderRadius: 999,
          backgroundColor: tone.bg,
          borderWidth: 1,
          borderColor: tone.border,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={17} color={tone.fg} />
      ) : null}
      <Text style={{ fontFamily: Fonts.semibold, fontSize: 14.5, color: tone.fg }}>{label}</Text>
    </Pressable>
  );
}

/** Botão redondo pequeno, para ações em linha (editar, excluir, mover). */
export function IconButton({
  icon,
  onPress,
  color,
  size = 34,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
  size?: number;
  loading?: boolean;
}) {
  const colors = useColors();
  const tint = color ?? colors.foreground;
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed || loading ? 0.6 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <Ionicons name={icon} size={size * 0.5} color={tint} />
      )}
    </Pressable>
  );
}

/** Campo de texto com rótulo, ajuda e suporte a múltiplas linhas. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  help,
  multiline,
  lines = 4,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  help?: string;
  multiline?: boolean;
  lines?: number;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "phone-pad" | "email-address";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  required?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: Fonts.semibold, fontSize: 12.5, color: colors.foreground }}>
        {label}
        {required ? <Text style={{ color: colors.gold }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingHorizontal: 13,
          paddingVertical: 11,
          fontFamily: Fonts.sans,
          fontSize: 14.5,
          color: colors.foreground,
          minHeight: multiline ? lines * 22 + 22 : 46,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
      {help ? (
        <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}>
          {help}
        </Text>
      ) : null}
    </View>
  );
}

/** Linha com interruptor — ativo, destaque, controlar estoque, etc. */
export function SwitchRow({
  label,
  help,
  value,
  onValueChange,
}: {
  label: string;
  help?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: colors.foreground }}>
          {label}
        </Text>
        {help ? (
          <Text style={{ fontFamily: Fonts.sans, fontSize: 11.5, color: colors.mutedForeground }}>
            {help}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.gold }}
        thumbColor={Platform.OS === "android" ? (value ? colors.ink : colors.card) : undefined}
      />
    </View>
  );
}

/** Grupo de "pílulas" para escolher uma opção (categorias, status, modo). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  scroll = true,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  scroll?: boolean;
}) {
  const colors = useColors();
  const content = options.map((opt) => {
    const active = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        onPress={() => onChange(opt.value)}
        style={({ pressed }) => ({
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: active ? colors.foreground : colors.border,
          backgroundColor: active ? colors.foreground : "transparent",
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text
          style={{
            fontFamily: Fonts.semibold,
            fontSize: 12.5,
            color: active ? colors.background : colors.mutedForeground,
          }}
        >
          {opt.label}
        </Text>
      </Pressable>
    );
  });

  if (!scroll) {
    return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{content}</View>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
    >
      {content}
    </ScrollView>
  );
}

/** Etiqueta de status / informação. */
export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "gold" | "success" | "danger" | "warning";
}) {
  const colors = useColors();
  const map = {
    neutral: colors.mutedForeground,
    gold: colors.gold,
    success: colors.success,
    danger: colors.destructive,
    warning: colors.warning,
  };
  const tint = map[tone];
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tint,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: Fonts.semibold, fontSize: 10.5, color: tint }}>{label}</Text>
    </View>
  );
}

/** Mensagem de erro em bloco. */
export function ErrorNote({ message }: { message?: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.destructive,
        borderRadius: 12,
        padding: 11,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ fontFamily: Fonts.medium, fontSize: 12.5, color: colors.destructive }}>
        {message}
      </Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={{ paddingVertical: 60, alignItems: "center", gap: 10 }}>
      <ActivityIndicator color={colors.gold} />
      {label ? (
        <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: colors.mutedForeground }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function Empty({
  icon = "cube-outline",
  title,
  text,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  text?: string;
}) {
  const colors = useColors();
  return (
    <View style={{ paddingVertical: 50, alignItems: "center", gap: 8, paddingHorizontal: 30 }}>
      <Ionicons name={icon} size={34} color={colors.mutedForeground} />
      <Text style={{ fontFamily: Fonts.semibold, fontSize: 15, color: colors.foreground }}>
        {title}
      </Text>
      {text ? (
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 13,
            color: colors.mutedForeground,
            textAlign: "center",
          }}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

/** Título de seção dentro de formulários longos. */
export function SectionTitle({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          fontFamily: Fonts.display,
          fontSize: 16,
          color: colors.foreground,
          marginTop: 4,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Caixa de confirmação simples, inline (funciona no preview web e no Android). */
export function ConfirmRow({
  question,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
  loading,
}: {
  question: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.destructive,
        borderRadius: 12,
        padding: 12,
        gap: 10,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: colors.foreground }}>
        {question}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={confirmLabel}
          variant="danger"
          onPress={onConfirm}
          loading={loading}
          style={{ flex: 1, paddingVertical: 10 }}
        />
        <Button
          label="Cancelar"
          variant="outline"
          onPress={onCancel}
          style={{ flex: 1, paddingVertical: 10 }}
        />
      </View>
    </View>
  );
}

/** Contador +/- para quantidades (estoque, ordem). */
export function Stepper({
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <IconButton icon="remove" onPress={() => onChange(Math.max(min, value - step))} />
      <Text
        style={{
          fontFamily: Fonts.display,
          fontSize: 16,
          minWidth: 42,
          textAlign: "center",
          color: colors.foreground,
        }}
      >
        {value}
      </Text>
      <IconButton icon="add" onPress={() => onChange(value + step)} />
    </View>
  );
}

/** Campo de busca. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar...",
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: 999,
        paddingHorizontal: 14,
      }}
    >
      <Ionicons name="search" size={16} color={colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={{
          flex: 1,
          paddingVertical: 11,
          fontFamily: Fonts.sans,
          fontSize: 14,
          color: colors.foreground,
        }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close-circle" size={17} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Aviso de sucesso que aparece por alguns segundos após salvar. */
export function useFlash(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  function flash(next: string) {
    setMsg(next);
    setTimeout(() => setMsg(null), 4500);
  }
  return [msg, flash];
}

export function SuccessNote({ message }: { message?: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.success,
        borderRadius: 12,
        padding: 11,
        backgroundColor: colors.card,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
      <Text style={{ fontFamily: Fonts.medium, fontSize: 12.5, color: colors.success }}>
        {message}
      </Text>
    </View>
  );
}
