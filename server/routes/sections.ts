import { Hono } from 'hono';
import { sql } from '../db.js';
import { requireUser, type AppEnv } from '../auth.js';
import { ownSection } from '../access.js';
import { deleteStoredFiles } from '../media.js';

export const sections = new Hono<AppEnv>();
sections.use('*', requireUser);

sections.patch('/:id', async c => {
  const section = await ownSection(c.req.param('id'), c.get('userId'));
  const input = await c.req.json<{
    title?: string;
    description?: string;
    icon?: string;
    icon_color?: string;
    image_url?: string;
    status?: string;
    sort_order?: number;
  }>();
  const status = ['active', 'draft', 'hidden'].includes(input.status ?? '') ? input.status! : null;
  // image_url só pode ser limpo (''): imagens novas entram pelas fotos do álbum
  const clearImage = input.image_url === '';
  const rows = await sql`
    UPDATE sections SET
      title = COALESCE(${input.title?.trim() || null}, title),
      description = COALESCE(${input.description ?? null}, description),
      icon = COALESCE(${input.icon ?? null}, icon),
      icon_color = COALESCE(${input.icon_color ?? null}, icon_color),
      image_url = CASE WHEN ${clearImage} THEN NULL ELSE image_url END,
      photo_count = CASE WHEN ${clearImage} AND image_url IS NOT NULL THEN GREATEST(0, photo_count - 1) ELSE photo_count END,
      status = COALESCE(${status}, status),
      sort_order = COALESCE(${Number.isInteger(input.sort_order) ? input.sort_order! : null}, sort_order),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${section.id}
    RETURNING *
  `;
  if (clearImage) await deleteStoredFiles([section.image_url]);
  return c.json(rows[0]);
});

sections.delete('/:id', async c => {
  const userId = c.get('userId');
  const section = await ownSection(c.req.param('id'), userId);
  // Fotos da seção saem junto, devolvendo o espaço ao usuário
  const media = await sql`SELECT original_url, thumbnail_url, medium_url, file_size, file_type FROM media WHERE section_id = ${section.id}`;
  const bytes = media.reduce((sum, m) => sum + (Number(m.file_size) || 0), 0);
  const photos = media.filter(m => String(m.file_type).startsWith('image/')).length;
  const videos = media.filter(m => String(m.file_type).startsWith('video/')).length;
  await sql.transaction([
    sql`DELETE FROM media WHERE section_id = ${section.id}`,
    sql`DELETE FROM sections WHERE id = ${section.id}`,
    sql`UPDATE users SET storage_used = GREATEST(0, storage_used - ${bytes}) WHERE id = ${userId}`,
    sql`UPDATE albums SET total_photos = GREATEST(0, total_photos - ${photos}), total_videos = GREATEST(0, total_videos - ${videos}),
          last_edited_at = CURRENT_TIMESTAMP WHERE id = ${section.album_id}`,
  ]);
  await deleteStoredFiles([...media.flatMap(m => [m.original_url, m.thumbnail_url, m.medium_url]), section.image_url]);
  return c.body(null, 204);
});
