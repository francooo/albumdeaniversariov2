import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const databaseUrl = env.DATABASE_URL || env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'import.meta.env.VITE_DATABASE_URL': JSON.stringify(databaseUrl),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''),
      'import.meta.env.VITE_GOOGLE_CALLBACK_URL': JSON.stringify(env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_CALLBACK_URL || ''),
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
