// Move para o Cloudflare R2 as imagens antigas gravadas em base64 (data:) no banco.
// Pode rodar várias vezes: só mexe no que ainda começa com "data:". Uso: npm run db:migrate-files
import 'dotenv/config';
import { randomUUID } from 'node:crypto';

const { sql } = await import('../server/db.js');
const { putObject, publicUrl } = await import('../server/storage.js');

function decode(dataUrl: string): { body: Buffer; contentType: string; ext: string } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m || !m[2]) return null;
  const contentType = m[1];
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  return { body: Buffer.from(m[3], 'base64'), contentType, ext };
}

async function upload(dataUrl: string, keyBase: string): Promise<string | null> {
  const file = decode(dataUrl);
  if (!file) return null;
  const key = `${keyBase}.${file.ext}`;
  await putObject(key, file.body, file.contentType);
  return publicUrl(key);
}

let moved = 0;
let skipped = 0;
const done = (url: string | null) => (url ? moved++ : skipped++);

// Fotos
for (const m of await sql`
  SELECT m.id, m.user_id, m.album_id, m.original_url, m.thumbnail_url, m.medium_url FROM media m
  WHERE m.original_url LIKE 'data:%' OR m.thumbnail_url LIKE 'data:%' OR m.medium_url LIKE 'data:%'
`) {
  const base = `u/${m.user_id}/a/${m.album_id}/${randomUUID()}`;
  const original = m.original_url?.startsWith('data:') ? await upload(m.original_url, base) : m.original_url;
  const thumb = m.thumbnail_url?.startsWith('data:') ? await upload(m.thumbnail_url, `${base}_t`) : m.thumbnail_url;
  const medium = m.medium_url?.startsWith('data:') ? await upload(m.medium_url, `${base}_m`) : m.medium_url;
  await sql`UPDATE media SET original_url = ${original}, thumbnail_url = ${thumb}, medium_url = ${medium} WHERE id = ${m.id}`;
  done(original);
}

// Capas avulsas
for (const a of await sql`
  SELECT id, user_id, cover_image_url, cover_thumbnail_url FROM albums
  WHERE cover_image_url LIKE 'data:%' OR cover_thumbnail_url LIKE 'data:%'
`) {
  const base = `u/${a.user_id}/a/${a.id}/cover-${randomUUID()}`;
  const cover = a.cover_image_url?.startsWith('data:') ? await upload(a.cover_image_url, base) : a.cover_image_url;
  const thumb = a.cover_thumbnail_url?.startsWith('data:') ? await upload(a.cover_thumbnail_url, `${base}_t`) : a.cover_thumbnail_url;
  await sql`UPDATE albums SET cover_image_url = ${cover}, cover_thumbnail_url = ${thumb} WHERE id = ${a.id}`;
  done(cover);
}

// Imagens gravadas direto nas seções (modelo antigo)
for (const s of await sql`
  SELECT s.id, s.album_id, s.image_url, a.user_id FROM sections s JOIN albums a ON a.id = s.album_id
  WHERE s.image_url LIKE 'data:%'
`) {
  const url = await upload(s.image_url, `u/${s.user_id}/a/${s.album_id}/section-${randomUUID()}`);
  if (url) await sql`UPDATE sections SET image_url = ${url} WHERE id = ${s.id}`;
  done(url);
}

// Fotos de perfil
for (const u of await sql`SELECT id, avatar_url FROM users WHERE avatar_url LIKE 'data:%'`) {
  const url = await upload(u.avatar_url, `u/${u.id}/avatar-${randomUUID()}`);
  if (url) await sql`UPDATE users SET avatar_url = ${url} WHERE id = ${u.id}`;
  done(url);
}

const [left] = await sql`
  SELECT
    (SELECT COUNT(*) FROM media WHERE original_url LIKE 'data:%' OR thumbnail_url LIKE 'data:%' OR medium_url LIKE 'data:%') +
    (SELECT COUNT(*) FROM albums WHERE cover_image_url LIKE 'data:%' OR cover_thumbnail_url LIKE 'data:%') +
    (SELECT COUNT(*) FROM sections WHERE image_url LIKE 'data:%') +
    (SELECT COUNT(*) FROM users WHERE avatar_url LIKE 'data:%') AS remaining
`;
console.log(`Movidas para o R2: ${moved}. Ignoradas (formato inválido): ${skipped}. Ainda em base64 no banco: ${left.remaining}.`);
