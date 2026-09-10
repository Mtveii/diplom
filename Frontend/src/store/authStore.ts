import { create } from 'zustand'
import type { AuthUserProfile } from '@/types/auth'

const TOKEN_STORAGE_KEY = 'slush-access-token'

interface AuthState {
  accessToken: string | null
  user: AuthUserProfile | null
  setAccessToken: (token: string) => void
  clearAccessToken: () => void
  setUser: (user: AuthUserProfile | null) => void
  logout: () => void
  isTokenExpired: (token: string | null) => boolean
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true
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
    console.warn('[authStore] localStorage недоступен — токен не восстановлен', err)
    return null
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: readInitialToken(),
  user: null,
  setAccessToken: (token) => {
    if (isTokenExpired(token)) {
      console.warn('[authStore] Попытка сохранить просроченный токен — отклонено')
      return
    }
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch (err) {
      console.warn('[authStore] Не удалось сохранить токен', err)
    }
    set({ accessToken: token })
  },
  clearAccessToken: () => {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch (err) {
      console.warn('[authStore] Не удалось удалить токен', err)
    }
    set({ accessToken: null, user: null })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch (err) {
      console.warn('[authStore] Не удалось удалить токен при выходе', err)
    }
    set({ accessToken: null, user: null })
  },
  isTokenExpired,
}))
