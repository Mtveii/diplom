import { create } from 'zustand'
import { decodeRoleFromToken } from '@/utils/role'

const TOKEN_STORAGE_KEY = 'slush-access-token'
/** Ключи токенов Slush-Front (панель входа живёт там, своей формы у нас нет). */
const SLUSH_ACCESS_KEY = 'accessToken'
const SLUSH_REFRESH_KEY = 'refreshToken'

function readStorage(key: string, session = false): string | null {
  try {
    return session ? window.sessionStorage.getItem(key) : window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Токен по приоритету: свой ключ (тихий dev-вход) → accessToken Slush-Front
 * (localStorage → sessionStorage, same-origin деплой).
 */

interface AuthState {
  accessToken: string | null
  /** Роль из JWT (сырая строка). null — анонимно или роль не распознана. */
  role: string | null
  setAccessToken: (token: string) => void
  clearAccessToken: () => void
}

/** Проверка exp без JWT-библиотек: просроченный токен не храним. */
export function isTokenExpired(token: string): boolean {
  try {
    const base64 = token.split('.')[1] ?? ''
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    if (typeof payload.exp !== 'number') return false
    return Date.now() >= payload.exp * 1000
  } catch {
    return false
  }
}

function readInitialToken(): string | null {
  const own = readStorage(TOKEN_STORAGE_KEY)
  if (own) {
    // Свой ключ приоритетнее — но протухший чистим и идём дальше, а не анонимно.
    if (isTokenExpired(own)) {
      try {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      } catch {
        // ignore
      }
    } else {
      return own
    }
  }
  // Токен Slush-Front (туда редиректит их логин). Протухший дальше не пускаем.
  const shared = readStorage(SLUSH_ACCESS_KEY) ?? readStorage(SLUSH_ACCESS_KEY, true)
  if (shared && !isTokenExpired(shared)) {
    return shared
  }
  return null
}

const initialToken = readInitialToken()

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: initialToken,
  role: decodeRoleFromToken(initialToken),
  setAccessToken: (token) => {
    if (isTokenExpired(token)) {
      return
    }
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch (err) {
      console.warn('[authStore] Не удалось сохранить токен', err)
    }
    set({ accessToken: token, role: decodeRoleFromToken(token) })
  },
  clearAccessToken: () => {
    // Чистим и ключи Slush-Front: протухший/отозванный токен там тоже мёртв,
    // иначе следующий маунт подхватит его заново и зациклит 401.
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      window.localStorage.removeItem(SLUSH_ACCESS_KEY)
      window.localStorage.removeItem(SLUSH_REFRESH_KEY)
      window.sessionStorage.removeItem(SLUSH_ACCESS_KEY)
      window.sessionStorage.removeItem(SLUSH_REFRESH_KEY)
    } catch {
      // ignore — чистим состояние в любом случае
    }
    set({ accessToken: null, role: null })
  },
}))
