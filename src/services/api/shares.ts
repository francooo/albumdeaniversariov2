import { enc, http } from './http';
import type { Media } from './media';
import type { Section } from './sections';

export interface PublicAlbum {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  cover_image_url?: string;
  cover_thumbnail_url?: string;
  theme?: string;
  layout?: string;
  style?: string;
  event_date?: string | null;
  total_photos?: number;
  total_videos?: number;
  created_at?: string;
}

export type PublicAlbumResult =
  | { valid: true; album: PublicAlbum; ownerName: string; isOwner: boolean; sections: Section[]; media: Media[] }
  | { valid: false; error: 'not_found' | 'inactive' | 'expired' };

/** Álbum aberto pelo link compartilhado: tudo o que o livro precisa numa única chamada. */
export function getPublicAlbum(token: string): Promise<PublicAlbumResult> {
  return http.get<PublicAlbumResult>(`/public/${enc(token)}`);
}

/** Guarda na conta de quem está logado um álbum recebido por link (somente leitura). */
export function claimAlbumShare(token: string, _userId?: string): Promise<{ success: boolean; albumId?: string; error?: string }> {
  return http.post(`/public/${enc(token)}/claim`);
}

export function getShareLinkStatus(albumId: string): Promise<{ token: string | null; isActive: boolean }> {
  return http.get(`/albums/${enc(albumId)}/share`);
}

export async function generateShareToken(albumId: string): Promise<string> {
  return (await http.post<{ token: string }>(`/albums/${enc(albumId)}/share`)).token;
}

export async function toggleShareLink(albumId: string, active: boolean): Promise<boolean> {
  await http.patch(`/albums/${enc(albumId)}/share`, { active });
  return true;
}

export function getShareStats(albumId: string): Promise<{ totalViews: number; uniqueViews: number; claimedByUsers: number }> {
  return http.get(`/albums/${enc(albumId)}/share/stats`);
}
