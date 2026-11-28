// Servidor da API para desenvolvimento local (o Vite encaminha /api para cá).
// O dotenv precisa vir antes de tudo: server/db.ts lê DATABASE_URL ao ser carregado.
import 'dotenv/config';
import { serve } from '@hono/node-server';

const { app } = await import('./app.js');
const port = Number(process.env.API_PORT) || 8787;

serve({ fetch: app.fetch, port }, info => console.log(`API do Memórias em http://localhost:${info.port}/api`));
