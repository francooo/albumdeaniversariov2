import { Hono } from 'hono';
import { sql } from '../db.js';
import { badRequest } from '../errors.js';
import { requireUser, type AppEnv } from '../auth.js';
import { ownAlbum } from '../access.js';
import { IMAGE_TYPES, MAX_FILE_BYTES, albumPrefix, newKeys, storageFullError, storageStatus, userPrefix, verifyUploaded } from '../media.js';
import { deleteStoredFiles } from '../media.js';
import { presignPut, publicUrl } from '../storage.js';
import { findUserRow, logAudit, publicUser } from '../users.js';

/**
 * Envio de arquivos em 3 passos:
 * 1. POST /uploads → o servidor confere dono e espaço e devolve URLs assinadas;
 * 2. o navegador envia os arquivos direto ao R2 (PUT);
 * 3. o navegador confirma (POST /albums/:id/media, /uploads/avatar ou /uploads/cover).
 */
export const uploads = new Hono<AppEnv>();
uploads.use('*', requireUser);

type FileSpec = { size: number; contentType: string };

function checkFile(f: unknown): FileSpec {
  const spec = f as Partial<FileSpec> | undefined;
  const size = Number(spec?.size);
  const contentType = String(spec?.contentType ?? '');
  if (!IMAGE_TYPES.includes(contentType)) throw badRequest('Formato de imagem não aceito.');
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) throw badRequest('A imagem está grande demais.');
  return { size, contentType };
}

uploads.post('/', async c => {
  const userId = c.get('userId');
  const body = await c.req.json<{ kind?: string; albumId?: string; main?: FileSpec; thumb?: FileSpec }>();
  const kind = body.kind;
  if (kind !== 'media' && kind !== 'cover' && kind !== 'avatar') throw badRequest('Tipo de envio inválido.');
  if (kind !== 'avatar') await ownAlbum(body.albumId ?? '', userId);

  const main = checkFile(body.main);
  const thumb = kind === 'avatar' || !body.thumb ? null : checkFile(body.thumb);

  // Só fotos do álbum contam no espaço do plano (capa e avatar são uma imagem cada)
  if (kind === 'media') {
    const st = await storageStatus(userId);
    const bytes = main.size + (thumb?.size ?? 0);
    if (bytes > st.remaining) throw storageFullError(st.used, st.limit, bytes);
  }

  const keys = newKeys(kind, userId, body.albumId);
  return c.json({
    main: { key: keys.main, uploadUrl: await presignPut(keys.main, main.contentType, main.size) },
    thumb: thumb && keys.thumb ? { key: keys.thumb, uploadUrl: await presignPut(keys.thumb, thumb.contentType, thumb.size) } : null,
  });
});

/** Passo 3 do avatar: troca a foto de perfil e apaga a anterior. */
uploads.post('/avatar', async c => {
  const userId = c.get('userId');
  const { key } = await c.req.json<{ key?: string }>();
  const file = await verifyUploaded(key, `${userPrefix(userId)}avatar-`);
  const before = await findUserRow(userId);
  const rows = await sql`UPDATE users SET avatar_url = ${publicUrl(file.key)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${userId} RETURNING *`;
  await deleteStoredFiles([before?.avatar_url]);
  await logAudit(userId, 'avatar_updated');
  return c.json(publicUser(rows[0]));
});

/** Passo 3 da capa avulsa: devolve as URLs públicas para a tela salvar junto com o design. */
uploads.post('/cover', async c => {
  const userId = c.get('userId');
  const { albumId, key, thumbKey } = await c.req.json<{ albumId?: string; key?: string; thumbKey?: string }>();
  const album = await ownAlbum(albumId ?? '', userId);
  const prefix = `${albumPrefix(userId, album.id)}cover-`;
  const main = await verifyUploaded(key, prefix);
  const thumb = thumbKey ? await verifyUploaded(thumbKey, prefix) : null;
  return c.json({ cover_image_url: publicUrl(main.key), cover_thumbnail_url: thumb ? publicUrl(thumb.key) : null });
});
