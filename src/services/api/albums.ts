import { enc, http } from './http';
import type { PlanId } from '../../lib/plans';

export { PlanLimitError } from './http';

export interface Album {
  id: string;
  user_id: string;
  title: string;
  subtitle?: string;
  description?: string;
  cover_image_url?: string;
  cover_thumbnail_url?: string;
  background_image_url?: string;
  custom_background_url?: string;
  theme: string;
  accent_color: string;
  status: string;
  is_public: boolean;
  view_count: number;
  total_photos: number;
  total_videos: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  last_edited_by?: string;
  last_edited_at?: string;
  event_date?: string | null;
  occasion?: string | null;
  layout?: string | null;
  style?: string | null;
}

/** Álbum com dados agregados para listagens (contagem de seções e miniatura de capa). */
export interface AlbumSummary extends Album {
  section_count: number;
  cover_thumb: string | null;
}

export interface CreateAlbumSection {
  title: string;
  icon?: string;
}

export interface CreateAlbumInput {
  /** Ignorado: o servidor usa o usuário da sessão. */
  user_id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  theme?: string;
  status?: string;
  is_public?: boolean;
  occasion?: string | null;
  event_date?: string | null;
  sections?: CreateAlbumSection[];
}

/** Só álbuns do próprio usuário; de outra pessoa (ou inexistente) volta null. */
export async function getAlbumById(albumId: string): Promise<Album | null> {
  try {
    return await http.get<Album>(`/albums/${enc(albumId)}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

/** Cria o álbum (o servidor aplica o limite do plano, as seções da ocasião e a visibilidade padrão). */
export function createAlbum(input: CreateAlbumInput): Promise<Album> {
  const { user_id: _ignored, ...body } = input;
  return http.post<Album>('/albums', body);
}

/** Álbuns do usuário logado com contagem de seções e miniatura de capa. O parâmetro é ignorado. */
export function getAlbumSummaries(_userId?: string): Promise<AlbumSummary[]> {
  return http.get<AlbumSummary[]>('/albums');
}

/** Quantos álbuns o usuário tem e quantos o plano permite. */
export async function getAlbumQuota(_userId?: string): Promise<{ used: number; limit: number; plan: PlanId }> {
  const q = await http.get<{ used: number; limit: number | null; plan: PlanId }>('/albums/quota');
  return { ...q, limit: q.limit ?? Infinity };
}

export function updateAlbumDetails(albumId: string, data: { title: string; subtitle: string | null; event_date: string | null }): Promise<Album> {
  return http.patch<Album>(`/albums/${enc(albumId)}`, data);
}

export function publishAlbum(albumId: string): Promise<Album> {
  return http.post<Album>(`/albums/${enc(albumId)}/publish`);
}

export function unpublishAlbum(albumId: string): Promise<Album> {
  return http.post<Album>(`/albums/${enc(albumId)}/unpublish`);
}

/** Tema, layout, estilo e capa avulsa (já enviada com uploadAlbumCover). */
export function updateAlbumDesign(
  albumId: string,
  data: { theme: string; layout: string; style: string; cover_image_url?: string | null; cover_thumbnail_url?: string | null },
): Promise<Album> {
  return http.patch<Album>(`/albums/${enc(albumId)}/design`, data);
}

/** Exclui o álbum, as fotos e os arquivos, e devolve o espaço ao usuário. */
export function deleteAlbum(albumId: string): Promise<void> {
  return http.del(`/albums/${enc(albumId)}`);
}
