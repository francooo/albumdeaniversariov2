import { Hono } from 'hono';
import { sql } from '../db.js';
import { badRequest } from '../errors.js';
import { requireUser, type AppEnv } from '../auth.js';
import { ownMedia, toUuidList } from '../access.js';
import { deleteStoredFiles } from '../media.js';

export const media = new Hono<AppEnv>();
media.use('*', requireUser);

/** Nova ordem das fotos (só mexe nas fotos de álbuns do próprio usuário). */
media.put('/order', async c => {
  const ids = toUuidList((await c.req.json<{ ids?: unknown }>()).ids);
  const userId = c.get('userId');
  if (ids.length) {
    await sql.transaction(
      ids.map(
        (id, i) => sql`
          UPDATE media SET sort_order = ${i}
          WHERE id = ${id} AND album_id IN (SELECT id FROM albums WHERE user_id = ${userId})
        `,
      ),
    );
  }
  return c.body(null, 204);
});

/** Legenda e/ou troca de seção. Ao mover, a foto vai para o fim da seção de destino. */
media.patch('/:id', async c => {
  const m = await ownMedia(c.req.param('id'), c.get('userId'));
  const data = await c.req.json<{ caption?: string | null; section_id?: string }>();
  if (data.caption !== undefined) {
    await sql`UPDATE media SET caption = ${data.caption ? String(data.caption).slice(0, 500) : null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${m.id}`;
  }
  if (data.section_id && data.section_id !== m.section_id) {
    const target = await sql`SELECT id FROM sections WHERE id = ${toUuidList([data.section_id])[0] ?? null} AND album_id = ${m.album_id}`;
    if (!target.length) throw badRequest('Seção inválida.');
    await sql`
      UPDATE media SET section_id = ${data.section_id},
        sort_order = (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM media WHERE section_id = ${data.section_id}),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${m.id}
    `;
    await sql.transaction(
      [m.section_id, data.section_id].filter(Boolean).map(
        sid => sql`
          UPDATE sections SET
            photo_count = (SELECT COUNT(*) FROM media WHERE section_id = ${sid} AND file_type LIKE 'image/%'),
            video_count = (SELECT COUNT(*) FROM media WHERE section_id = ${sid} AND file_type LIKE 'video/%')
          WHERE id = ${sid}
        `,
      ),
    );
  }
  return c.body(null, 204);
});

media.delete('/:id', async c => {
  const userId = c.get('userId');
  const m = await ownMedia(c.req.param('id'), userId);
  const isImage = String(m.file_type).startsWith('image/') ? 1 : 0;
  const isVideo = String(m.file_type).startsWith('video/') ? 1 : 0;
  await sql.transaction([
    sql`DELETE FROM media WHERE id = ${m.id}`,
    sql`UPDATE users SET storage_used = GREATEST(0, storage_used - ${Number(m.file_size) || 0}) WHERE id = ${userId}`,
    sql`UPDATE albums SET total_photos = GREATEST(0, total_photos - ${isImage}), total_videos = GREATEST(0, total_videos - ${isVideo})
        WHERE id = ${m.album_id}`,
    sql`UPDATE sections SET photo_count = GREATEST(0, photo_count - ${isImage}), video_count = GREATEST(0, video_count - ${isVideo})
        WHERE id = ${m.section_id}`,
  ]);
  await deleteStoredFiles([m.original_url, m.thumbnail_url, m.medium_url]);
  return c.body(null, 204);
});
