import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { errorMessage } from "@/lib/format";
import { pickFromLibrary, takePhoto, uploadFile, type UploadedFile } from "@/lib/media";
import { Button, ErrorNote } from "./ui";

/**
 * Par de botões "Galeria" / "Câmera" que já envia os arquivos para o storage
 * e devolve as keys prontas para salvar no produto.
 */
export function PickButtons({
  onUploaded,
  multiple,
  videos,
  camera = true,
  label = "Enviar foto",
}: {
  onUploaded: (files: UploadedFile[]) => void;
  multiple?: boolean;
  videos?: boolean;
  camera?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(source: "library" | "camera") {
    setError(null);
    setBusy(true);
    try {
      const picked = source === "camera" ? await takePhoto() : await pickFromLibrary({ multiple, videos });
      if (picked.length === 0) return;
      const uploaded: UploadedFile[] = [];
      for (const file of picked) uploaded.push(await uploadFile(file));
      onUploaded(uploaded);
    } catch (e) {
      setError(errorMessage(e, "Não foi possível enviar o arquivo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={busy ? "Enviando..." : label}
          icon="images-outline"
          variant="outline"
          loading={busy}
          onPress={() => run("library")}
          style={{ flex: 1, paddingVertical: 11 }}
        />
        {camera ? (
          <Button
            label="Câmera"
            icon="camera-outline"
            variant="outline"
            disabled={busy}
            onPress={() => run("camera")}
            style={{ flex: 1, paddingVertical: 11 }}
          />
        ) : null}
      </View>
      <ErrorNote message={error} />
    </View>
  );
}

/** Miniatura quadrada de imagem/vídeo, com botão de remover. */
export function Thumb({
  url,
  kind = "image",
  size = 84,
  onRemove,
}: {
  url: string;
  kind?: "image" | "video";
  size?: number;
  onRemove?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={{ width: size, height: size }}>
      {kind === "video" ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="videocam" size={22} color={colors.mutedForeground} />
          <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: colors.mutedForeground }}>
            vídeo
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: url }}
          style={{
            width: size,
            height: size,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.secondary,
          }}
          resizeMode="cover"
        />
      )}
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.destructive,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={14} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}
