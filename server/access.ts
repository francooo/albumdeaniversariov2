import { nanoid } from 'nanoid';
import { isUuid, sql } from './db.js';
import { notFound } from './errors.js';

/**
 * Conferência de dono. Quem não é dono recebe 404 (não revela que o item existe).
 */
export async function ownAlbum(albumId: string, userId: string): Promise<Record<string, any>> {
  if (!isUuid(albumId)) throw notFound('Álbum');
  const rows = await sql`SELECT * FROM albums WHERE id = ${albumId} AND user_id = ${userId}`;
  if (!rows[0]) throw notFound('Álbum');
  return rows[0];
}

export async function ownSection(sectionId: string, userId: string): Promise<Record<string, any>> {
  if (!isUuid(sectionId)) throw notFound('Seção');
  const rows = await sql`
    SELECT s.* FROM sections s JOIN albums a ON a.id = s.album_id
    WHERE s.id = ${sectionId} AND a.user_id = ${userId}
  `;
  if (!rows[0]) throw notFound('Seção');
  return rows[0];
}

export async function ownMedia(mediaId: string, userId: string): Promise<Record<string, any>> {
  if (!isUuid(mediaId)) throw notFound('Foto');
  const rows = await sql`
    SELECT m.* FROM media m JOIN albums a ON a.id = m.album_id
    WHERE m.id = ${mediaId} AND a.user_id = ${userId}
  `;
  if (!rows[0]) throw notFound('Foto');
  return rows[0];
}

/** Token do link público do álbum (cria um se ainda não houver). */
export async function ensureShareToken(albumId: string): Promise<string> {
  const existing = await sql`
    SELECT share_token FROM album_shares WHERE album_id = ${albumId} AND access_type = 'public_link' AND share_token IS NOT NULL LIMIT 1
  `;
  if (existing[0]) return existing[0].share_token as string;
  const token = nanoid(24);
  await sql`
    INSERT INTO album_shares (album_id, share_token, link_active, access_type, permission)
    VALUES (${albumId}, ${token}, true, 'public_link', 'viewer')
  `;
  return token;
}

export const toUuidList = (ids: unknown): string[] => (Array.isArray(ids) ? ids.filter(isUuid) : []);
