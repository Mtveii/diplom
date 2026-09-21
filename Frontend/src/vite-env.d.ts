/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Только локальный dev (gitignored .env.local). В прод-бандл не попадают. */
  readonly VITE_AUTH_EMAIL?: string
  readonly VITE_AUTH_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
