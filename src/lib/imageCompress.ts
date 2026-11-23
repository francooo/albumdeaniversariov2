/**
 * Compressão de imagens no navegador antes de gravar no banco (base64 no Postgres).
 * Gera a versão principal (até 1600 px) e a miniatura (até 400 px), ambas JPEG.
 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export interface CompressedImage {
  dataUrl: string;
  thumbDataUrl: string;
  width: number;
  height: number;
  /** Tamanho aproximado em bytes do que será armazenado (principal + miniatura). */
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

function render(source: CanvasImageSource, w: number, h: number, maxSide: number, quality: number) {
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
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width: cw, height: ch };
}

function dataUrlBytes(dataUrl: string) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((b64.length * 3) / 4);
}

export async function compressImage(file: Blob, opts: { maxSide?: number; thumbSide?: number; quality?: number } = {}): Promise<CompressedImage> {
  const { maxSide = 1600, thumbSide = 400, quality = 0.8 } = opts;
  const bmp = await loadBitmap(file);
  try {
    const main = render(bmp.source, bmp.width, bmp.height, maxSide, quality);
    const thumb = render(bmp.source, bmp.width, bmp.height, thumbSide, 0.72);
    return {
      dataUrl: main.dataUrl,
      thumbDataUrl: thumb.dataUrl,
      width: main.width,
      height: main.height,
      bytes: dataUrlBytes(main.dataUrl) + dataUrlBytes(thumb.dataUrl),
    };
  } finally {
    bmp.close();
  }
}

/** Para avatares e capas avulsas: só uma versão, menor. */
export async function compressSingle(file: Blob, maxSide = 512, quality = 0.82): Promise<string> {
  const bmp = await loadBitmap(file);
  try {
    return render(bmp.source, bmp.width, bmp.height, maxSide, quality).dataUrl;
  } finally {
    bmp.close();
  }
}
