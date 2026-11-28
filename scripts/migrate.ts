// Aplica as migrações no banco do .env. Uso: npm run db:migrate
import 'dotenv/config';

const { sql } = await import('../server/db.js');
const { runMigrations } = await import('../server/migrations.js');

await runMigrations(sql);
console.log('Migrações aplicadas.');
