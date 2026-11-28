import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { sql } from '../db.js';
import { HttpError } from '../errors.js';
import { requireUser, sessionUserId, type AppEnv } from '../auth.js';

/** Álbum aberto pelo link compartilhado. Só o token dá acesso, e só aos campos que podem ser públicos. */
export const publicRoutes = new Hono<AppEnv>();

async function activeShare(token: string) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) return { error: 'not_found' as const };
  const rows = await sql`SELECT album_id, link_active, expires_at FROM album_shares WHERE share_token = ${token} LIMIT 1`;
  const share = rows[0];
  if (!share) return { error: 'not_found' as const };
  if (!share.link_active) return { error: 'inactive' as const };
  if (share.expires_at && new Date(share.expires_at) < new Date()) return { error: 'expired' as const };
  return { albumId: share.album_id as string };
}

publicRoutes.get('/:token', async c => {
  const token = c.req.param('token');
  const share = await activeShare(token);
  if ('error' in share) return c.json({ valid: false, error: share.error });

  const [albums, sections, media] = await sql.transaction([
    sql`
      SELECT a.id, a.title, a.subtitle, a.description, a.cover_image_url, a.cover_thumbnail_url, a.theme, a.layout, a.style,
        a.event_date, a.total_photos, a.total_videos, a.created_at, a.user_id,
        COALESCE(NULLIF(u.public_name, ''), u.name) AS owner_name
      FROM albums a JOIN users u ON a.user_id = u.id
      WHERE a.id = ${share.albumId}
    `,
    sql`
      SELECT id, album_id, title, description, icon, icon_color, image_url, section_type, sort_order, status, photo_count, video_count
      FROM sections WHERE album_id = ${share.albumId} AND status <> 'hidden'
      ORDER BY sort_order ASC, created_at ASC
    `,
    sql`
      SELECT id, album_id, section_id, file_name, original_url, thumbnail_url, medium_url, file_type, width, height, caption, sort_order, is_cover
      FROM media WHERE album_id = ${share.albumId}
      ORDER BY sort_order ASC, created_at ASC
    `,
  ]);
  const row = albums[0];
  if (!row) return c.json({ valid: false, error: 'not_found' });

  const { owner_name, user_id, ...album } = row;
  const viewer = await sessionUserId(c);
  if (viewer !== user_id) {
    // Visualização anônima: guarda só um hash do IP (LGPD)
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = createHash('sha256').update(ip + (process.env.SESSION_SECRET ?? '')).digest('hex');
    await sql`INSERT INTO album_share_views (album_id, share_token, user_id, ip_hash) VALUES (${share.albumId}, ${token}, ${viewer}, ${ipHash})`.catch(
      () => {},
    );
  }
  return c.json({ valid: true, album, ownerName: owner_name ?? '', isOwner: viewer === user_id, sections, media });
});

/** Quem está logado e abre o link guarda o álbum na conta (somente leitura). */
publicRoutes.post('/:token/claim', requireUser, async c => {
  const userId = c.get('userId');
  const share = await activeShare(c.req.param('token'));
  if ('error' in share) throw new HttpError(404, share.error, 'Este link não está disponível.');
  const owner = await sql`SELECT user_id FROM albums WHERE id = ${share.albumId}`;
  if (owner[0]?.user_id === userId) return c.json({ success: false, error: 'own_album' });
  const existing = await sql`SELECT 1 FROM album_shares WHERE album_id = ${share.albumId} AND user_id = ${userId} LIMIT 1`;
  if (!existing.length) {
    await sql`
      INSERT INTO album_shares (album_id, user_id, permission, access_type, claimed_at)
      VALUES (${share.albumId}, ${userId}, 'viewer', 'public_link', CURRENT_TIMESTAMP)
    `;
  }
  return c.json({ success: true, albumId: share.albumId });
});
