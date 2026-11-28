import { Hono } from 'hono';
import { sql } from '../db.js';
import { HttpError, badRequest, notFound } from '../errors.js';
import { hashPassword, requireUser, verifyPassword, type AppEnv } from '../auth.js';
import { findUserRow, logAudit, publicUser } from '../users.js';
import { PLANS, storageLimitFor } from '../../src/lib/plans.js';

/** Conta do usuário logado. Toda rota usa o id da sessão, nunca um id vindo do navegador. */
export const me = new Hono<AppEnv>();
me.use('*', requireUser);

const clientInfo = (c: { req: { header: (n: string) => string | undefined } }) => ({
  ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  ua: c.req.header('user-agent') ?? null,
});

me.get('/', async c => {
  const row = await findUserRow(c.get('userId'));
  if (!row) throw notFound('Usuário');
  return c.json(publicUser(row));
});

me.patch('/', async c => {
  const userId = c.get('userId');
  // A foto de perfil não muda aqui: entra só por /uploads/avatar, que confere o arquivo
  const input = await c.req.json<{ name?: string; public_name?: string; email?: string; phone?: string; birth_date?: string }>();
  const email = input.email?.trim().toLowerCase() || null;
  if (email) {
    const taken = await sql`SELECT 1 FROM users WHERE lower(email) = ${email} AND id <> ${userId}`;
    if (taken.length) throw new HttpError(409, 'email_taken', 'Este e-mail já está em uso em outra conta.');
  }
  const rows = await sql`
    UPDATE users SET
      name = COALESCE(${input.name ?? null}, name),
      public_name = COALESCE(${input.public_name ?? null}, public_name),
      email = COALESCE(${email}, email),
      phone = COALESCE(${input.phone ?? null}, phone),
      birth_date = COALESCE(${input.birth_date || null}, birth_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING *
  `;
  await logAudit(userId, 'profile_updated');
  return c.json(publicUser(rows[0]));
});

me.patch('/privacy', async c => {
  const userId = c.get('userId');
  const input = await c.req.json<{
    is_public_profile?: boolean;
    albums_public?: boolean;
    show_email?: boolean;
    email_notifications?: boolean;
    marketing_emails?: boolean;
    default_album_visibility?: 'private' | 'link' | 'public';
  }>();
  if (input.default_album_visibility && !['private', 'link', 'public'].includes(input.default_album_visibility)) {
    throw badRequest('Visibilidade inválida.');
  }
  const now = new Date().toISOString();
  const optIn = input.marketing_emails === true ? now : null;
  const optOut = input.marketing_emails === false ? now : null;
  const rows = await sql`
    UPDATE users SET
      default_album_visibility = COALESCE(${input.default_album_visibility ?? null}, default_album_visibility),
      is_public_profile = COALESCE(${input.is_public_profile ?? null}, is_public_profile),
      albums_public = COALESCE(${input.albums_public ?? null}, albums_public),
      show_email = COALESCE(${input.show_email ?? null}, show_email),
      email_notifications = COALESCE(${input.email_notifications ?? null}, email_notifications),
      marketing_emails = COALESCE(${input.marketing_emails ?? null}, marketing_emails),
      marketing_opt_in_at = COALESCE(${optIn}, marketing_opt_in_at),
      marketing_opt_out_at = COALESCE(${optOut}, marketing_opt_out_at),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING *
  `;
  return c.json(publicUser(rows[0]));
});

me.post('/password', async c => {
  const userId = c.get('userId');
  const { currentPassword, newPassword } = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
  if (!newPassword || newPassword.length < 6) throw badRequest('A nova senha precisa ter pelo menos 6 caracteres.');
  const row = await findUserRow(userId);
  const check = await verifyPassword(currentPassword ?? '', row?.password_hash);
  if (!check.ok) return c.json({ ok: false });
  await sql`UPDATE users SET password_hash = ${await hashPassword(newPassword)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${userId}`;
  await logAudit(userId, 'password_changed');
  return c.json({ ok: true });
});

// Upgrade continua sem cobrança, como antes da API (pagamento é outro item do roadmap)
me.post('/plan', async c => {
  const { plan } = await c.req.json<{ plan?: string }>();
  if (plan !== 'basic' && plan !== 'premium') throw badRequest('Plano inválido.');
  const rows = await sql`
    UPDATE users SET plan_type = ${plan}, storage_limit = ${PLANS[plan].storageBytes}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${c.get('userId')} RETURNING *
  `;
  return c.json(publicUser(rows[0]));
});

me.get('/stats', async c => {
  const userId = c.get('userId');
  const [albumStats, sectionStats, userRows] = await sql.transaction([
    sql`SELECT COUNT(*) AS total_albums, COALESCE(SUM(total_photos), 0) AS total_photos, COALESCE(SUM(total_videos), 0) AS total_videos
        FROM albums WHERE user_id = ${userId}`,
    sql`SELECT COUNT(*) AS total_sections FROM sections s JOIN albums a ON s.album_id = a.id WHERE a.user_id = ${userId}`,
    sql`SELECT storage_used, plan_type FROM users WHERE id = ${userId}`,
  ]);
  return c.json({
    totalAlbums: Number(albumStats[0]?.total_albums || 0),
    totalSections: Number(sectionStats[0]?.total_sections || 0),
    totalPhotos: Number(albumStats[0]?.total_photos || 0),
    totalVideos: Number(albumStats[0]?.total_videos || 0),
    storageUsed: Number(userRows[0]?.storage_used || 0),
    storageLimit: storageLimitFor(userRows[0]?.plan_type),
  });
});

me.post('/data-export', async c => {
  const userId = c.get('userId');
  const rows = await sql`
    INSERT INTO data_export_requests (user_id, status, expires_at)
    VALUES (${userId}, 'pending', CURRENT_TIMESTAMP + INTERVAL '7 days')
    RETURNING id
  `;
  return c.json({ requestId: rows[0].id, message: 'Solicitação recebida. Seus dados serão preparados e enviados por e-mail em até 24 horas.' });
});

me.post('/deletion', async c => {
  const userId = c.get('userId');
  await sql`
    UPDATE users SET deletion_requested_at = CURRENT_TIMESTAMP, deleted_at = CURRENT_TIMESTAMP + INTERVAL '30 days', updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
  // A tela registra a auditoria e depois chama /auth/logout, que encerra a sessão
  return c.body(null, 204);
});

// Eventos que a tela de Privacidade registra; só ações da própria conta e de uma lista fechada
const CLIENT_AUDIT_ACTIONS = new Set([
  'profile_visibility_changed',
  'albums_visibility_changed',
  'email_visibility_changed',
  'email_notifications_changed',
  'marketing_emails_opt_in',
  'marketing_emails_opt_out',
  'data_export_requested',
  'account_deletion_requested',
]);

me.post('/audit', async c => {
  const { action, details } = await c.req.json<{ action?: string; details?: Record<string, unknown> }>();
  if (!action || !CLIENT_AUDIT_ACTIONS.has(action)) throw badRequest('Ação de auditoria inválida.');
  const { ip, ua } = clientInfo(c);
  await logAudit(c.get('userId'), action, details, ip, ua);
  return c.body(null, 204);
});
