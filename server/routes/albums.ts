import { Hono } from 'hono';
import { sql } from '../db.js';
import { HttpError, badRequest } from '../errors.js';
import { requireUser, type AppEnv } from '../auth.js';
import { ensureShareToken, ownAlbum, toUuidList } from '../access.js';
import { getPlan } from '../../src/lib/plans.js';
import { addMedia, albumPrefix, deleteStoredFiles } from '../media.js';
import { keyFromUrl } from '../storage.js';

export const albums = new Hono<AppEnv>();
albums.use('*', requireUser);

const THEMES = ['creme', 'pessego', 'salvia', 'ceu', 'noite', 'terracota'];
const LAYOUTS = ['one', 'two', 'collage'];
const STYLES = ['jardim', 'festa', 'polaroid', 'cinema'];
const PRO_THEMES = ['noite', 'terracota'];
const PRO_STYLES = ['cinema'];

// ---------- Álbuns ----------

albums.get('/', async c => {
  const rows = await sql`
    SELECT a.*,
      (SELECT COUNT(*) FROM sections s WHERE s.album_id = a.id) AS section_count,
      COALESCE(
        a.cover_thumbnail_url,
        a.cover_image_url,
        (SELECT COALESCE(m.thumbnail_url, m.original_url) FROM media m
          WHERE m.album_id = a.id AND m.file_type LIKE 'image/%'
          ORDER BY m.is_cover DESC NULLS LAST, m.sort_order ASC, m.created_at ASC LIMIT 1),
        (SELECT s.image_url FROM sections s WHERE s.album_id = a.id AND s.image_url IS NOT NULL
          ORDER BY s.sort_order ASC LIMIT 1)
      ) AS cover_thumb
    FROM albums a
    WHERE a.user_id = ${c.get('userId')}
    ORDER BY COALESCE(a.last_edited_at, a.updated_at, a.created_at) DESC
  `;
  return c.json(rows.map(r => ({ ...r, section_count: Number(r.section_count) || 0 })));
});

albums.get('/quota', async c => {
  const userId = c.get('userId');
  const rows = await sql`
    SELECT plan_type, (SELECT COUNT(*) FROM albums WHERE user_id = ${userId}) AS album_count FROM users WHERE id = ${userId}
  `;
  const plan = getPlan(rows[0]?.plan_type);
  // Infinity não existe em JSON: null = ilimitado
  return c.json({ used: Number(rows[0]?.album_count) || 0, limit: Number.isFinite(plan.albumLimit) ? plan.albumLimit : null, plan: plan.id });
});

albums.post('/', async c => {
  const userId = c.get('userId');
  const input = await c.req.json<{
    title?: string;
    subtitle?: string;
    description?: string;
    theme?: string;
    status?: string;
    is_public?: boolean;
    occasion?: string | null;
    event_date?: string | null;
    sections?: { title: string; icon?: string }[];
  }>();
  const title = (input.title ?? '').trim();
  if (!title) throw badRequest('Dê um título ao álbum.');

  const userRows = await sql`
    SELECT plan_type, default_album_visibility, (SELECT COUNT(*) FROM albums WHERE user_id = ${userId}) AS album_count
    FROM users WHERE id = ${userId}
  `;
  const userRow = userRows[0];
  const plan = getPlan(userRow?.plan_type);
  if (Number(userRow?.album_count) >= plan.albumLimit) {
    throw new HttpError(403, 'plan_limit', `Você chegou ao máximo de ${plan.albumLimit} álbuns do plano ${plan.name}.`);
  }

  const visibility = userRow?.default_album_visibility || 'link';
  const isPublic = input.is_public ?? visibility === 'public';
  const theme = THEMES.includes(input.theme ?? '') ? input.theme : 'creme';
  const status = input.status === 'active' ? 'active' : 'draft';

  const rows = await sql`
    INSERT INTO albums (user_id, title, subtitle, description, theme, accent_color, status, is_public, occasion, event_date, layout, style)
    VALUES (${userId}, ${title}, ${input.subtitle || null}, ${input.description || null}, ${theme}, '#C67139', ${status}, ${isPublic},
      ${input.occasion || null}, ${input.event_date || null}, 'two', 'jardim')
    RETURNING *
  `;
  const album = rows[0];

  const sections = Array.isArray(input.sections) ? input.sections.slice(0, 50) : [];
  if (sections.length) {
    await sql.transaction(
      sections.map(
        (s, i) => sql`
          INSERT INTO sections (album_id, title, icon, icon_color, section_type, status, sort_order)
          VALUES (${album.id}, ${String(s.title).slice(0, 255)}, ${s.icon || 'calendar_today'}, '#C67139', 'category', 'active', ${i})
        `,
      ),
    );
  }

  // "Quem tem o link" / "Público": já deixa o link de compartilhamento ativo
  if (visibility !== 'private') await ensureShareToken(album.id).catch(err => console.warn('share token:', err));
  return c.json(album);
});

albums.get('/:id', async c => c.json(await ownAlbum(c.req.param('id'), c.get('userId'))));

albums.patch('/:id', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const data = await c.req.json<{ title?: string; subtitle?: string | null; event_date?: string | null }>();
  const title = (data.title ?? '').trim();
  if (!title) throw badRequest('Dê um título ao álbum.');
  const rows = await sql`
    UPDATE albums SET title = ${title}, subtitle = ${data.subtitle || null}, event_date = ${data.event_date || null},
      updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${album.id} RETURNING *
  `;
  return c.json(rows[0]);
});

albums.post('/:id/publish', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const rows = await sql`
    UPDATE albums SET status = 'active', published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${album.id} RETURNING *
  `;
  return c.json(rows[0]);
});

albums.post('/:id/unpublish', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const rows = await sql`
    UPDATE albums SET status = 'draft', updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${album.id} RETURNING *
  `;
  return c.json(rows[0]);
});

albums.patch('/:id/design', async c => {
  const userId = c.get('userId');
  const album = await ownAlbum(c.req.param('id'), userId);
  const data = await c.req.json<{ theme?: string; layout?: string; style?: string; cover_image_url?: string | null; cover_thumbnail_url?: string | null }>();
  if (!THEMES.includes(data.theme ?? '') || !LAYOUTS.includes(data.layout ?? '') || !STYLES.includes(data.style ?? '')) {
    throw badRequest('Tema, layout ou estilo inválido.');
  }
  // Temas e estilos PRO também são barrados aqui, não só na tela
  const userRows = await sql`SELECT plan_type FROM users WHERE id = ${userId}`;
  // (o que o álbum já tinha salvo continua valendo, ex.: depois de voltar ao Básico)
  const newPro = (PRO_THEMES.includes(data.theme!) && data.theme !== album.theme) || (PRO_STYLES.includes(data.style!) && data.style !== album.style);
  if (!getPlan(userRows[0]?.plan_type).proDesigns && newPro) {
    throw new HttpError(403, 'pro_only', 'Este tema ou estilo é do plano Premium.');
  }
  // Capa avulsa só pode ser um arquivo enviado para a pasta deste álbum (passo 3 em /uploads/cover)
  const coverPrefix = `${albumPrefix(userId, album.id)}cover-`;
  for (const url of [data.cover_image_url, data.cover_thumbnail_url]) {
    if (url && !keyFromUrl(url)?.startsWith(coverPrefix)) throw badRequest('Capa inválida.');
  }
  const rows = await sql`
    UPDATE albums SET theme = ${data.theme!}, layout = ${data.layout!}, style = ${data.style!},
      cover_image_url = COALESCE(${data.cover_image_url ?? null}, cover_image_url),
      cover_thumbnail_url = COALESCE(${data.cover_thumbnail_url ?? null}, cover_thumbnail_url),
      updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
    WHERE id = ${album.id} RETURNING *
  `;
  if (data.cover_image_url) {
    // Capa avulsa substitui a capa escolhida entre as fotos; a capa avulsa anterior sai do armazenamento
    await sql`UPDATE media SET is_cover = false WHERE album_id = ${album.id} AND is_cover = true`;
    await deleteStoredFiles([album.cover_image_url, album.cover_thumbnail_url].filter(u => u && u !== data.cover_image_url && u !== data.cover_thumbnail_url));
  }
  return c.json(rows[0]);
});

albums.delete('/:id', async c => {
  const userId = c.get('userId');
  const album = await ownAlbum(c.req.param('id'), userId);
  const media = await sql`SELECT original_url, thumbnail_url, medium_url, file_size FROM media WHERE album_id = ${album.id}`;
  const sections = await sql`SELECT image_url FROM sections WHERE album_id = ${album.id}`;
  const bytes = media.reduce((sum, m) => sum + (Number(m.file_size) || 0), 0);
  await sql.transaction([
    sql`DELETE FROM albums WHERE id = ${album.id}`,
    sql`UPDATE users SET storage_used = GREATEST(0, storage_used - ${bytes}) WHERE id = ${userId}`,
  ]);
  await deleteStoredFiles([
    ...media.flatMap(m => [m.original_url, m.thumbnail_url, m.medium_url]),
    ...sections.map(s => s.image_url),
    album.cover_image_url,
    album.cover_thumbnail_url,
  ]);
  return c.body(null, 204);
});

// ---------- Seções do álbum ----------

albums.get('/:id/sections', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  return c.json(await sql`SELECT * FROM sections WHERE album_id = ${album.id} ORDER BY sort_order ASC, created_at ASC`);
});

albums.post('/:id/sections', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const input = await c.req.json<{ title?: string; description?: string; icon?: string; icon_color?: string; section_type?: string; status?: string }>();
  const title = (input.title ?? '').trim();
  if (!title) throw badRequest('Dê um nome à seção.');
  const type = ['year', 'age', 'category', 'custom'].includes(input.section_type ?? '') ? input.section_type : 'category';
  const status = ['active', 'draft', 'hidden'].includes(input.status ?? '') ? input.status : 'active';
  const rows = await sql`
    INSERT INTO sections (album_id, title, description, icon, icon_color, section_type, status, sort_order, photo_count)
    VALUES (${album.id}, ${title}, ${input.description || null}, ${input.icon || 'calendar_today'}, ${input.icon_color || '#C67139'},
      ${type!}, ${status!}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM sections WHERE album_id = ${album.id}), 0)
    RETURNING *
  `;
  return c.json(rows[0]);
});

albums.put('/:id/sections/order', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const ids = toUuidList((await c.req.json<{ ids?: unknown }>()).ids);
  if (ids.length) {
    await sql.transaction(
      ids.map((id, i) => sql`UPDATE sections SET sort_order = ${i}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} AND album_id = ${album.id}`),
    );
  }
  return c.body(null, 204);
});

// ---------- Fotos do álbum ----------

albums.get('/:id/media', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  if (c.req.query('full') === '1') {
    return c.json(await sql`SELECT * FROM media WHERE album_id = ${album.id} ORDER BY sort_order ASC, created_at ASC`);
  }
  return c.json(
    await sql`
      SELECT id, album_id, section_id, file_name, COALESCE(thumbnail_url, original_url) AS thumbnail_url,
        file_type, file_size, width, height, caption, sort_order, is_cover, created_at
      FROM media WHERE album_id = ${album.id}
      ORDER BY sort_order ASC, created_at ASC
    `,
  );
});

albums.post('/:id/media', async c => {
  const userId = c.get('userId');
  const album = await ownAlbum(c.req.param('id'), userId);
  return c.json(await addMedia(userId, album.id, await c.req.json()));
});

albums.post('/:id/cover', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const { mediaId } = await c.req.json<{ mediaId?: string }>();
  const owned = await sql`SELECT 1 FROM media WHERE id = ${toUuidList([mediaId])[0] ?? null} AND album_id = ${album.id}`;
  if (!owned.length) throw badRequest('Essa foto não é deste álbum.');
  await sql.transaction([
    sql`UPDATE media SET is_cover = (id = ${mediaId!}) WHERE album_id = ${album.id}`,
    sql`UPDATE albums SET cover_image_url = NULL, cover_thumbnail_url = NULL, updated_at = CURRENT_TIMESTAMP, last_edited_at = CURRENT_TIMESTAMP
        WHERE id = ${album.id}`,
  ]);
  await deleteStoredFiles([album.cover_image_url, album.cover_thumbnail_url]);
  return c.body(null, 204);
});

// ---------- Link de compartilhamento ----------

albums.get('/:id/share', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const rows = await sql`
    SELECT share_token, link_active FROM album_shares
    WHERE album_id = ${album.id} AND access_type = 'public_link' AND share_token IS NOT NULL LIMIT 1
  `;
  return c.json(rows[0] ? { token: rows[0].share_token, isActive: rows[0].link_active } : { token: null, isActive: false });
});

albums.post('/:id/share', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  return c.json({ token: await ensureShareToken(album.id) });
});

albums.patch('/:id/share', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const { active } = await c.req.json<{ active?: boolean }>();
  await sql`UPDATE album_shares SET link_active = ${Boolean(active)} WHERE album_id = ${album.id} AND access_type = 'public_link'`;
  return c.body(null, 204);
});

albums.get('/:id/share/stats', async c => {
  const album = await ownAlbum(c.req.param('id'), c.get('userId'));
  const [views, claims] = await sql.transaction([
    sql`SELECT COUNT(*) AS total_views, COUNT(DISTINCT ip_hash) AS unique_views FROM album_share_views WHERE album_id = ${album.id}`,
    sql`SELECT COUNT(*) AS claimed_count FROM album_shares WHERE album_id = ${album.id} AND user_id IS NOT NULL AND claimed_at IS NOT NULL`,
  ]);
  return c.json({
    totalViews: Number(views[0]?.total_views || 0),
    uniqueViews: Number(views[0]?.unique_views || 0),
    claimedByUsers: Number(claims[0]?.claimed_count || 0),
  });
});
