import { sql } from './db.js';
import { storageLimitFor } from '../src/lib/plans.js';

/** Usuário como o navegador recebe: nunca leva hash de senha nem id do Google. */
export function publicUser(row: Record<string, any>) {
  const { password_hash, google_id, ...rest } = row;
  return {
    ...rest,
    has_password: Boolean(password_hash),
    google_linked: Boolean(google_id),
    storage_used: Number(rest.storage_used) || 0,
    storage_limit: storageLimitFor(rest.plan_type),
  };
}

export async function findUserRow(userId: string): Promise<Record<string, any> | null> {
  const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
  return rows[0] ?? null;
}

export async function logAudit(userId: string, action: string, details?: Record<string, unknown>, ip?: string | null, userAgent?: string | null) {
  try {
    await sql`
      INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
      VALUES (${userId}, ${action}, ${details ? JSON.stringify(details) : null}, ${ip ?? null}, ${userAgent ?? null})
    `;
  } catch (err) {
    // Registro de auditoria nunca deve derrubar a ação do usuário
    console.warn('audit log failed:', (err as Error).message);
  }
}
