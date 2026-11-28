/**
 * Compressão de imagens no navegador antes do envio ao armazenamento de arquivos (Cloudflare R2).
 * Gera a versão principal (até 1600 px) e a miniatura (até 400 px), ambas JPEG.
 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export interface CompressedImage {
  blob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  /** Tamanho em bytes do que será armazenado (principal + miniatura). */
  bytes: number;
}

export class ImageInputError extends Error {}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    if (file.type.startsWith('video/')) return `${file.name}: vídeos ainda não são aceitos.`;
    return `${file.name}: formato não suportado. Use JPG, PNG, WEBP ou GIF.`;
  }
  if (file.size > MAX_INPUT_BYTES) return `${file.name}: a foto passa de 15 MB.`;
  return null;
}

async function loadBitmap(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* cai para <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageInputError('Não foi possível ler esta imagem.');
  }
}

async function render(source: CanvasImageSource, w: number, h: number, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageInputError('Seu navegador não conseguiu processar a imagem.');
  // Fundo papel para PNG/GIF com transparência (JPEG não tem alfa)
  ctx.fillStyle = '#FFF9F0';
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, cw, ch);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new ImageInputError('Seu navegador não conseguiu processar a imagem.');
  return { blob, width: cw, height: ch };
}

export async function compressImage(file: Blob, opts: { maxSide?: number; thumbSide?: number; quality?: number } = {}): Promise<CompressedImage> {
  const { maxSide = 1600, thumbSide = 400, quality = 0.8 } = opts;
  const bmp = await loadBitmap(file);
  try {
    const main = await render(bmp.source, bmp.width, bmp.height, maxSide, quality);
    const thumb = await render(bmp.source, bmp.width, bmp.height, thumbSide, 0.72);
    return { blob: main.blob, thumbBlob: thumb.blob, width: main.width, height: main.height, bytes: main.blob.size + thumb.blob.size };
  } finally {
    bmp.close();
  }
}

/** Para avatares: só uma versão, menor. */
export async function compressSingle(file: Blob, maxSide = 512, quality = 0.82): Promise<Blob> {
  const bmp = await loadBitmap(file);
  try {
    return (await render(bmp.source, bmp.width, bmp.height, maxSide, quality)).blob;
  } finally {
    bmp.close();
  }
}
