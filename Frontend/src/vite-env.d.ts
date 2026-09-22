/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Только локальный dev (gitignored .env.local). В прод-бандл не попадают. */
  readonly VITE_AUTH_EMAIL?: string
  readonly VITE_AUTH_PASSWORD?: string
  /** URL логина Slush-Front для кнопки на hint-панели (опционально). */
  readonly VITE_SLUSH_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
