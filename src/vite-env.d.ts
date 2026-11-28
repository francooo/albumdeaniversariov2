/// <reference types="vite/client" />

// Variáveis que chegam ao navegador. Segredos (banco, sessão, R2) nunca entram aqui.
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
