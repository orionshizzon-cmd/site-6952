import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { client } from "./api";

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  /** "image" ou "video" — usado na mídia extra do produto. */
  kind: "image" | "video";
};

export type UploadedFile = {
  key: string;
  url: string;
  kind: "image" | "video";
};

function guessName(uri: string, fallbackExt: string): string {
  const raw = uri.split("?")[0].split("/").pop() || `arquivo.${fallbackExt}`;
  return raw.includes(".") ? raw : `${raw}.${fallbackExt}`;
}

function assetToFile(asset: ImagePicker.ImagePickerAsset): PickedFile {
  const kind: "image" | "video" = asset.type === "video" ? "video" : "image";
  const ext = kind === "video" ? "mp4" : "jpg";
  const name = asset.fileName || guessName(asset.uri, ext);
  const mimeType =
    asset.mimeType || (kind === "video" ? "video/mp4" : "image/jpeg");
  return { uri: asset.uri, name, mimeType, kind };
}

/** Abre a galeria do celular. `multiple` permite escolher várias fotos/vídeos. */
export async function pickFromLibrary(options?: {
  multiple?: boolean;
  videos?: boolean;
}): Promise<PickedFile[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permissão da galeria negada. Libere o acesso nas configurações do aparelho.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: options?.videos ? ["images", "videos"] : ["images"],
    allowsMultipleSelection: options?.multiple ?? false,
    quality: 0.9,
    selectionLimit: options?.multiple ? 10 : 1,
  });
  if (result.canceled) return [];
  return result.assets.map(assetToFile);
}

/** Abre a câmera do celular para tirar a foto do produto na hora. */
export async function takePhoto(): Promise<PickedFile[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permissão da câmera negada. Libere o acesso nas configurações do aparelho.");
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.9,
  });
  if (result.canceled) return [];
  return result.assets.map(assetToFile);
}

/**
 * Envia o arquivo escolhido para o storage usando a URL assinada da API
 * (`upload.presign`) e devolve a key + URL de visualização.
 */
export async function uploadFile(file: PickedFile): Promise<UploadedFile> {
  const { uploadUrl, viewUrl, key } = await client.upload.presign({
    filename: file.name,
    contentType: file.mimeType,
  });

  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.mimeType },
      body: blob,
    });
    if (!res.ok) throw new Error("Falha ao enviar o arquivo. Tente novamente.");
  } else {
    const res = await FileSystem.uploadAsync(uploadUrl, file.uri, {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": file.mimeType },
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error("Falha ao enviar o arquivo. Tente novamente.");
    }
  }

  return { key, url: viewUrl, kind: file.kind };
}
