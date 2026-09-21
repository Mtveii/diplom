import { create } from 'zustand'
import { decodeRoleFromToken } from '@/utils/role'

const TOKEN_STORAGE_KEY = 'slush-access-token'

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
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (raw && isTokenExpired(raw)) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      return null
    }
    return raw
  } catch (err) {
    console.warn('[authStore] localStorage недоступен — начинаем без токена', err)
    return null
  }
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
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
      // ignore — чистим состояние в любом случае
    }
    set({ accessToken: null, role: null })
  },
}))
