import { ApiError, enc, http } from './http';
import type { CompressedImage } from '../../lib/imageCompress';
import type { User } from './users';

export interface Media {
  id: string;
  user_id: string;
  album_id?: string;
  section_id?: string;
  page_id?: string;
  file_name: string;
  original_url: string;
  thumbnail_url?: string;
  medium_url?: string;
  file_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
  alt_text?: string;
  sort_order: number;
  metadata?: Record<string, any>;
  is_cover?: boolean;
  created_at: string;
  updated_at: string;
}

/** Versão leve para grades (sem a imagem em tamanho original). */
export type MediaThumb = Pick<Media, 'id' | 'album_id' | 'section_id' | 'file_name' | 'thumbnail_url' | 'file_type' | 'file_size' | 'width' | 'height' | 'caption' | 'sort_order' | 'is_cover' | 'created_at'>;

// ---------- Envio de arquivos (R2) ----------

type Ticket = { main: { key: string; uploadUrl: string }; thumb: { key: string; uploadUrl: string } | null };

const JPEG = 'image/jpeg';

/** Passo 2: o arquivo vai direto do navegador para o R2, pela URL assinada pelo servidor. */
async function putFile(uploadUrl: string, blob: Blob) {
  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': JPEG } });
  } catch {
    throw new ApiError(0, 'upload_failed', 'Não foi possível enviar a foto. Verifique sua conexão e tente de novo.');
  }
  if (!res.ok) throw new ApiError(res.status, 'upload_failed', 'Não foi possível enviar a foto. Tente de novo.');
}

async function sendImage(kind: 'media' | 'cover', albumId: string, image: CompressedImage): Promise<Ticket> {
  const ticket = await http.post<Ticket>('/uploads', {
    kind,
    albumId,
    main: { size: image.blob.size, contentType: JPEG },
    thumb: { size: image.thumbBlob.size, contentType: JPEG },
  });
  await Promise.all([putFile(ticket.main.uploadUrl, image.blob), ticket.thumb ? putFile(ticket.thumb.uploadUrl, image.thumbBlob) : null]);
  return ticket;
}

/** Envia uma foto já comprimida para uma seção do álbum. */
export async function uploadPhoto(input: { albumId: string; sectionId?: string; fileName: string; image: CompressedImage }): Promise<Media> {
  const ticket = await sendImage('media', input.albumId, input.image);
  return http.post<Media>(`/albums/${enc(input.albumId)}/media`, {
    section_id: input.sectionId,
    file_name: input.fileName,
    key: ticket.main.key,
    thumb_key: ticket.thumb?.key,
    width: input.image.width,
    height: input.image.height,
  });
}

/** Envia a capa avulsa; as URLs devolvidas são salvas com updateAlbumDesign. */
export async function uploadAlbumCover(albumId: string, image: CompressedImage): Promise<{ cover_image_url: string; cover_thumbnail_url: string | null }> {
  const ticket = await sendImage('cover', albumId, image);
  return http.post('/uploads/cover', { albumId, key: ticket.main.key, thumbKey: ticket.thumb?.key });
}

/** Troca a foto de perfil. */
export async function uploadAvatar(blob: Blob): Promise<User> {
  const ticket = await http.post<Ticket>('/uploads', { kind: 'avatar', main: { size: blob.size, contentType: JPEG } });
  await putFile(ticket.main.uploadUrl, blob);
  return http.post<User>('/uploads/avatar', { key: ticket.main.key });
}

// ---------- Fotos ----------

export function deleteMedia(mediaId: string): Promise<void> {
  return http.del(`/media/${enc(mediaId)}`);
}

/** Miniaturas de todas as fotos do álbum (para grades e contagens por seção). */
export function getMediaThumbsByAlbum(albumId: string): Promise<MediaThumb[]> {
  return http.get<MediaThumb[]>(`/albums/${enc(albumId)}/media`);
}

/** Todas as mídias do álbum em tamanho original (para o livro). */
export function getMediaByAlbum(albumId: string): Promise<Media[]> {
  return http.get<Media[]>(`/albums/${enc(albumId)}/media?full=1`);
}

/** Legenda e/ou troca de seção. Ao mover, a foto vai para o fim da seção de destino. */
export function updateMedia(mediaId: string, data: { caption?: string | null; section_id?: string }): Promise<void> {
  return http.patch(`/media/${enc(mediaId)}`, data);
}

export function reorderMedia(mediaIds: string[]): Promise<void> {
  return http.put('/media/order', { ids: mediaIds });
}

/** Define uma foto do álbum como capa (remove a capa avulsa enviada na personalização). */
export function setCoverMedia(albumId: string, mediaId: string): Promise<void> {
  return http.post(`/albums/${enc(albumId)}/cover`, { mediaId });
}
