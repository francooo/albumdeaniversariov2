import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Só o Client ID do Google vai para o navegador (é público por natureza).
      // DATABASE_URL, SESSION_SECRET e as chaves do R2 ficam apenas no servidor (pasta server/).
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['@react-oauth/google'],
    },
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      // API local (server/dev.ts); na Vercel o /api é a função api/index.ts
      proxy: {
        '/api': `http://localhost:${env.API_PORT || 8787}`,
      },
      watch: {
        ignored: [
          '**/.local/**',
          '**/node_modules/**',
          '**/.git/**',
        ],
      },
    },
  };
});
