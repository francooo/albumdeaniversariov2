import { neon } from '@neondatabase/serverless';

/**
 * Conexão com o Neon. Só existe no servidor: a DATABASE_URL nunca vai para o navegador.
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não configurada no servidor.');

export const sql = neon(url);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
