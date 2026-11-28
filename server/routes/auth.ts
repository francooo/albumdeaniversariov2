import { Hono } from 'hono';
import { sql } from '../db.js';
import { HttpError, badRequest, unauthorized } from '../errors.js';
import { endSession, hashPassword, sessionUserId, startSession, verifyPassword, type AppEnv } from '../auth.js';
import { verifyGoogleAccessToken } from '../google.js';
import { findUserRow, logAudit, publicUser } from '../users.js';
import { PLANS } from '../../src/lib/plans.js';

export const auth = new Hono<AppEnv>();

const cleanEmail = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

auth.post('/register', async c => {
  const body = await c.req.json<{ name?: string; email?: string; password?: string; birth_date?: string }>();
  const name = (body.name ?? '').trim();
  const email = cleanEmail(body.email);
  const password = body.password ?? '';
  if (!name || !email.includes('@')) throw badRequest('Preencha nome e e-mail.');
  if (password.length < 6) throw badRequest('A senha precisa ter pelo menos 6 caracteres.');

  const existing = await sql`SELECT id FROM users WHERE lower(email) = ${email}`;
  if (existing.length) throw new HttpError(409, 'email_taken', 'Email já cadastrado');

  const rows = await sql`
    INSERT INTO users (name, email, password_hash, birth_date, plan_type, storage_used, storage_limit)
    VALUES (${name}, ${email}, ${await hashPassword(password)}, ${body.birth_date || null}, 'basic', 0, ${PLANS.basic.storageBytes})
    RETURNING *
  `;
  await startSession(c, rows[0].id);
  return c.json(publicUser(rows[0]));
});

auth.post('/login', async c => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = cleanEmail(body.email);
  const rows = await sql`SELECT * FROM users WHERE lower(email) = ${email} LIMIT 1`;
  const user = rows[0];
  const check = await verifyPassword(body.password ?? '', user?.password_hash);
  if (!user || !check.ok) {
    throw new HttpError(401, 'invalid_credentials', 'E-mail ou senha incorretos.');
  }
  // Conta antiga com hash fraco: regrava em scrypt agora que temos a senha certa
  if (check.needsRehash) {
    await sql`UPDATE users SET password_hash = ${await hashPassword(body.password!)} WHERE id = ${user.id}`;
  }
  await sql`UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ${user.id}`;
  await startSession(c, user.id);
  await logAudit(user.id, 'login_success');
  return c.json(publicUser(user));
});

auth.post('/google', async c => {
  const { accessToken } = await c.req.json<{ accessToken?: string }>();
  const g = await verifyGoogleAccessToken(accessToken ?? '');

  let rows = await sql`SELECT * FROM users WHERE google_id = ${g.googleId} LIMIT 1`;
  if (rows.length) {
    rows = await sql`
      UPDATE users SET updated_at = CURRENT_TIMESTAMP, avatar_url = COALESCE(avatar_url, ${g.avatarUrl ?? null})
      WHERE id = ${rows[0].id} RETURNING *
    `;
  } else {
    // O Google confirmou o e-mail: liga a conta existente com o mesmo e-mail
    rows = await sql`
      UPDATE users SET google_id = ${g.googleId}, avatar_url = COALESCE(avatar_url, ${g.avatarUrl ?? null}), updated_at = CURRENT_TIMESTAMP
      WHERE lower(email) = ${g.email} RETURNING *
    `;
    if (!rows.length) {
      rows = await sql`
        INSERT INTO users (name, email, google_id, avatar_url, plan_type, storage_used, storage_limit)
        VALUES (${g.name}, ${g.email}, ${g.googleId}, ${g.avatarUrl ?? null}, 'basic', 0, ${PLANS.basic.storageBytes})
        RETURNING *
      `;
    }
  }
  await startSession(c, rows[0].id);
  await logAudit(rows[0].id, 'login_success', { method: 'google' });
  return c.json(publicUser(rows[0]));
});

auth.post('/logout', async c => {
  const userId = await sessionUserId(c);
  endSession(c);
  if (userId) await logAudit(userId, 'logout');
  return c.body(null, 204);
});

auth.get('/me', async c => {
  const userId = await sessionUserId(c);
  const row = userId ? await findUserRow(userId) : null;
  if (!row) {
    endSession(c);
    throw unauthorized();
  }
  return c.json(publicUser(row));
});
