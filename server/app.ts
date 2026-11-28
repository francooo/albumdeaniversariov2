import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './auth.js';
import { HttpError } from './errors.js';
import { auth } from './routes/auth.js';
import { me } from './routes/me.js';
import { albums } from './routes/albums.js';
import { sections } from './routes/sections.js';
import { media } from './routes/media.js';
import { uploads } from './routes/uploads.js';
import { publicRoutes } from './routes/public.js';

/** API do Memórias. Roda como uma única função na Vercel (api/index.ts) e em server/dev.ts no computador. */
export const app = new Hono<AppEnv>().basePath('/api');

// Respostas da API nunca ficam em cache (dados pessoais)
app.use('*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});

app.get('/health', c => c.json({ ok: true }));
app.route('/auth', auth);
app.route('/me', me);
app.route('/albums', albums);
app.route('/sections', sections);
app.route('/media', media);
app.route('/uploads', uploads);
app.route('/public', publicRoutes);

app.notFound(c => c.json({ error: 'not_found', message: 'Rota não encontrada.' }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.code, message: err.message }, err.status);
  if (err instanceof HTTPException) return c.json({ error: 'bad_request', message: 'Requisição inválida.' }, err.status);
  if (err instanceof SyntaxError) return c.json({ error: 'bad_request', message: 'Requisição inválida.' }, 400);
  console.error(`[api] ${c.req.method} ${c.req.path}`, err);
  return c.json({ error: 'server_error', message: 'Algo deu errado do nosso lado. Tente de novo.' }, 500);
});
