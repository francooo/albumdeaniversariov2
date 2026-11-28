import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from '@hono/node-server/vercel';
import { app } from '../server/app.js';

// Corpo lido pelo Hono, não pelo parser da Vercel
export const config = { api: { bodyParser: false } };

const handler = handle(app);

/**
 * O vercel.json reescreve /api/<rota> para /api?__path=<rota>.
 * Aqui a URL original é reconstruída antes de entregar ao roteador.
 */
export default function api(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.searchParams.get('__path');
  if (path !== null) {
    url.searchParams.delete('__path');
    req.url = `/api/${path}${url.search}`;
  }
  return handler(req, res);
}
