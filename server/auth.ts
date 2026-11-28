import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { SignJWT, jwtVerify } from 'jose';
import { unauthorized } from './errors.js';

export type AppEnv = { Variables: { userId: string } };

const COOKIE = 'memorias_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET ausente ou curta (mínimo 32 caracteres).');
  return new TextEncoder().encode(s);
}

// Na Vercel é sempre HTTPS; em localhost (http) o cookie não pode exigir Secure
const secure = () => Boolean(process.env.VERCEL);

export async function startSession(c: Context, userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  setCookie(c, COOKIE, token, { httpOnly: true, secure: secure(), sameSite: 'Lax', path: '/', maxAge: MAX_AGE });
}

export function endSession(c: Context): void {
  deleteCookie(c, COOKIE, { path: '/', secure: secure() });
}

export async function sessionUserId(c: Context): Promise<string | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Exige sessão válida e expõe c.get('userId'). */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await sessionUserId(c);
  if (!userId) throw unauthorized();
  c.set('userId', userId);
  await next();
});

// ---------- Senhas ----------

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** Hash antigo (32 bits, sem sal) usado antes da API; só serve para migrar quem já tinha conta. */
function legacyHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };
  if (stored.startsWith('scrypt$')) {
    const [, saltB64, keyB64] = stored.split('$');
    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
    return { ok: actual.length === expected.length && timingSafeEqual(actual, expected), needsRehash: false };
  }
  if (stored.startsWith('hash_')) {
    return { ok: legacyHash(password) === stored, needsRehash: true };
  }
  return { ok: false, needsRehash: false };
}
