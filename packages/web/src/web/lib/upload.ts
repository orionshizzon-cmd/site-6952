import { client } from "./api";

// Faz upload de uma foto/logo do cliente e retorna a URL para visualização
export async function uploadCustomerImage(file: File): Promise<string> {
  const { uploadUrl, viewUrl } = await client.upload.presign({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });

  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });

  return viewUrl;
}

// Faz upload de um arquivo (foto ou vídeo) e retorna a key + url de preview.
// Usado no painel admin, onde guardamos a key no banco (URL é assinada na leitura).
export async function uploadFileReturnKey(
  file: File,
): Promise<{ key: string; url: string; type: "image" | "video" }> {
  const { uploadUrl, viewUrl, key } = await client.upload.presign({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });

  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });

  const type = file.type.startsWith("video/") ? "video" : "image";
  return { key, url: viewUrl, type };
}

// Faz upload de um SVG (string) e retorna a URL de visualização
export async function uploadSvgString(svg: string, filename: string): Promise<string> {
  const { uploadUrl, viewUrl } = await client.upload.presign({
    filename,
    contentType: "image/svg+xml",
  });

  await fetch(uploadUrl, {
    method: "PUT",
    body: new Blob([svg], { type: "image/svg+xml" }),
    headers: { "Content-Type": "image/svg+xml" },
  });

  return viewUrl;
}
