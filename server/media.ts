import { randomUUID } from 'node:crypto';
import { sql } from './db.js';
import { HttpError, badRequest } from './errors.js';
import { deleteKeys, headObject, keyFromUrl, publicUrl } from './storage.js';
import { storageLimitFor } from '../src/lib/plans.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // depois da compressão no navegador uma foto fica bem abaixo disso
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ---------- Chaves no R2 (sempre dentro da pasta do usuário) ----------

export const albumPrefix = (userId: string, albumId: string) => `u/${userId}/a/${albumId}/`;
export const userPrefix = (userId: string) => `u/${userId}/`;

export function newKeys(kind: 'media' | 'cover' | 'avatar', userId: string, albumId?: string) {
  const id = randomUUID();
  if (kind === 'avatar') return { main: `${userPrefix(userId)}avatar-${id}.jpg` };
  const base = albumPrefix(userId, albumId!) + (kind === 'cover' ? `cover-${id}` : id);
  return { main: `${base}.jpg`, thumb: `${base}_t.jpg` };
}

/** Confere que a chave é da pasta esperada e que o arquivo chegou ao R2; devolve tamanho e tipo reais. */
export async function verifyUploaded(key: unknown, prefix: string): Promise<{ key: string; size: number; contentType: string }> {
  if (typeof key !== 'string' || !key.startsWith(prefix) || key.includes('..')) throw badRequest('Arquivo inválido.');
  const head = await headObject(key);
  if (!head) throw badRequest('O arquivo não chegou ao armazenamento. Tente enviar de novo.');
  return { key, size: head.size, contentType: head.contentType || 'image/jpeg' };
}

export async function storageStatus(userId: string) {
  const rows = await sql`SELECT storage_used, plan_type FROM users WHERE id = ${userId}`;
  const used = Number(rows[0]?.storage_used) || 0;
  const limit = storageLimitFor(rows[0]?.plan_type);
  return { used, limit, remaining: limit - used };
}

export function storageFullError(used: number, limit: number, fileBytes: number) {
  const mb = (b: number) => (b / 1048576).toFixed(1);
  return new HttpError(
    413,
    'storage_full',
    `Limite de armazenamento excedido. Você usou ${mb(used)} MB de ${(limit / 1048576).toFixed(0)} MB. ` +
      `O arquivo tem ${mb(fileBytes)} MB. Faça upgrade para o plano Premium para mais espaço.`,
  );
}

/** Registra uma foto já enviada ao R2 (passo 3 do envio). */
export async function addMedia(
  userId: string,
  albumId: string,
  input: { section_id?: string; file_name?: string; key?: string; thumb_key?: string; width?: number; height?: number; caption?: string },
) {
  const prefix = albumPrefix(userId, albumId);
  const main = await verifyUploaded(input.key, prefix);
  const thumb = input.thumb_key ? await verifyUploaded(input.thumb_key, prefix) : null;

  let sectionId: string | null = null;
  if (input.section_id) {
    const s = await sql`SELECT id FROM sections WHERE id = ${input.section_id} AND album_id = ${albumId}`;
    if (!s.length) throw badRequest('Seção inválida.');
    sectionId = input.section_id;
  }

  const bytes = main.size + (thumb?.size ?? 0);
  const st = await storageStatus(userId);
  if (bytes > st.remaining) {
    await deleteKeys([main.key, thumb?.key].filter(Boolean) as string[]);
    throw storageFullError(st.used, st.limit, bytes);
  }

  const isImage = main.contentType.startsWith('image/');
  const isVideo = main.contentType.startsWith('video/');
  const rows = await sql`
    INSERT INTO media (user_id, album_id, section_id, file_name, original_url, thumbnail_url, file_type, file_size, width, height, caption, sort_order)
    VALUES (
      ${userId}, ${albumId}, ${sectionId}, ${String(input.file_name || 'foto.jpg').slice(0, 255)},
      ${publicUrl(main.key)}, ${thumb ? publicUrl(thumb.key) : null}, ${main.contentType}, ${bytes},
      ${Number(input.width) || null}, ${Number(input.height) || null}, ${input.caption || null},
      (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM media WHERE album_id = ${albumId} AND section_id IS NOT DISTINCT FROM ${sectionId})
    )
    RETURNING *
  `;
  await sql.transaction([
    sql`UPDATE users SET storage_used = storage_used + ${bytes} WHERE id = ${userId}`,
    sql`UPDATE albums SET
          total_photos = total_photos + ${isImage ? 1 : 0},
          total_videos = total_videos + ${isVideo ? 1 : 0},
          last_edited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${albumId}`,
    sql`UPDATE sections SET photo_count = photo_count + ${isImage ? 1 : 0}, video_count = video_count + ${isVideo ? 1 : 0}
        WHERE id = ${sectionId}`,
  ]);
  return rows[0];
}

/** Apaga do R2 os arquivos destas URLs (ignora vazias e URLs que não são do nosso bucket). */
export async function deleteStoredFiles(urls: unknown[]): Promise<void> {
  const keys = urls.map(keyFromUrl).filter((k): k is string => Boolean(k));
  await deleteKeys([...new Set(keys)]);
}
