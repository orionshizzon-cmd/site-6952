import { client } from "./api";

/** Envia um arquivo para o storage do Studio e devolve a chave gerada. */
export async function uploadStudioFile(file: File): Promise<string> {
  const { uploadUrl, key } = await client.studio.presignUpload({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!res.ok) throw new Error("Falha ao enviar o arquivo.");
  return key;
}

const MM_PER_INCH = 25.4;

/** Converte milímetros em pixels para o DPI desejado. */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

/** Lado maior mínimo do arquivo exportado (4K). */
export const MIN_EXPORT_LONG_EDGE = 3840;

/**
 * DPI necessário para que o lado maior da arte tenha no mínimo 4K (3840 px),
 * respeitando o piso de 300 DPI.
 */
export function exportDpi(widthMm: number, heightMm: number, minDpi = 300): number {
  const longEdgeMm = Math.max(widthMm, heightMm);
  if (longEdgeMm <= 0) return minDpi;
  const needed = Math.ceil((MIN_EXPORT_LONG_EDGE * MM_PER_INCH) / longEdgeMm);
  return Math.max(minDpi, needed);
}

/**
 * Exporta a imagem mantendo exatamente a proporção da foto enviada
 * (sem recorte e sem barras), ampliada para no mínimo 4K no lado maior.
 * `background` branco preenche o fundo; "transparent" mantém o alfa.
 * Passe `fitMm` para forçar o encaixe nas medidas do projeto em mm.
 */
export async function exportProjectPng(opts: {
  imageUrl: string;
  widthMm: number;
  heightMm: number;
  background: "white" | "transparent";
  /** Encaixa a arte na proporção do projeto (mm) em vez de usar a da foto. */
  fitMm?: boolean;
  /** Apaga o fundo da própria foto, deixando-o transparente. */
  removeBackground?: boolean;
  /** Sensibilidade da remoção de fundo (0-100, padrão 30). */
  tolerance?: number;
  filename: string;
}): Promise<void> {
  const img = await loadImage(opts.imageUrl);

  let w: number;
  let h: number;
  if (opts.fitMm) {
    const dpi = exportDpi(opts.widthMm, opts.heightMm);
    w = mmToPx(opts.widthMm, dpi);
    h = mmToPx(opts.heightMm, dpi);
  } else {
    // Mesma proporção da imagem enviada, lado maior com no mínimo 4K
    const long = Math.max(img.width, img.height) || MIN_EXPORT_LONG_EDGE;
    const scale = Math.max(1, MIN_EXPORT_LONG_EDGE / long);
    w = Math.round(img.width * scale);
    h = Math.round(img.height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a exportação.");

  if (opts.background === "white" && !opts.removeBackground) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (opts.fitMm) {
    // Encaixa a arte inteira dentro da área, centralizada, sem distorcer
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    ctx.drawImage(img, 0, 0, w, h);
  }

  if (opts.removeBackground) {
    eraseBackground(ctx, w, h, opts.tolerance ?? 30);
    if (opts.background === "white") {
      // Recompõe sobre branco mantendo o recorte
      const cut = ctx.getImageData(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      const flat = document.createElement("canvas");
      flat.width = w;
      flat.height = h;
      flat.getContext("2d")?.putImageData(cut, 0, 0);
      ctx.drawImage(flat, 0, 0);
    }
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) throw new Error("Não foi possível gerar o PNG.");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename.endsWith(".png") ? opts.filename : `${opts.filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Resolução final (px) de uma imagem exportada na proporção da foto enviada. */
export function fourKSize(
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } {
  const long = Math.max(naturalWidth, naturalHeight) || MIN_EXPORT_LONG_EDGE;
  const scale = Math.max(1, MIN_EXPORT_LONG_EDGE / long);
  return { width: Math.round(naturalWidth * scale), height: Math.round(naturalHeight * scale) };
}

/**
 * Deixa o fundo transparente: parte das bordas da imagem e apaga todos os pixels
 * conectados que tenham cor parecida com a do fundo (branco, cinza, cor de estúdio…).
 * `tolerance` vai de 0 (só a cor exata) a 100 (bem permissivo).
 */
export function eraseBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tolerance = 30,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const total = w * h;

  // Cor de fundo = média das quatro bordas
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    sr += d[i]!;
    sg += d[i + 1]!;
    sb += d[i + 2]!;
    n++;
  };
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 200))) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 200))) {
    sample(0, y);
    sample(w - 1, y);
  }
  const br = sr / n;
  const bg = sg / n;
  const bb = sb / n;

  const limit = (tolerance / 100) * 441.67; // distância máxima no espaço RGB
  const visited = new Uint8Array(total);
  const stack: number[] = [];

  const push = (idx: number) => {
    if (idx >= 0 && idx < total && !visited[idx]) {
      visited[idx] = 1;
      stack.push(idx);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const i = idx * 4;
    const dist = Math.sqrt((d[i]! - br) ** 2 + (d[i + 1]! - bg) ** 2 + (d[i + 2]! - bb) ** 2);
    if (dist > limit) continue;

    // Borda suave: quanto mais perto do limite, menos transparente
    const soft = limit === 0 ? 0 : Math.max(0, Math.min(1, (dist / limit) ** 2));
    d[i + 3] = Math.round(d[i + 3]! * soft);

    const x = idx % w;
    if (x > 0) push(idx - 1);
    if (x < w - 1) push(idx + 1);
    push(idx - w);
    push(idx + w);
  }

  ctx.putImageData(img, 0, 0);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = src;
  });
}

/** Baixa o projeto como arquivo .json para reabrir/editar depois. */
export function downloadProjectFile(project: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.rafa.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Mensagem de erro amigável a partir de um erro do oRPC. */
export function errMsg(e: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  const m = (e as { message?: string } | null)?.message;
  return m && m.length < 300 ? m : fallback;
}

export const STUDIO_STATUSES = [
  "Em criação",
  "Aguardando aprovação",
  "Pronto para gravar",
  "Finalizado",
] as const;

export const STATUS_STYLES: Record<string, string> = {
  "Em criação": "bg-white/10 text-white/70 border-white/15",
  "Aguardando aprovação": "bg-amber-500/15 text-amber-300 border-amber-400/30",
  "Pronto para gravar": "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  Finalizado: "bg-sky-500/15 text-sky-300 border-sky-400/30",
};
