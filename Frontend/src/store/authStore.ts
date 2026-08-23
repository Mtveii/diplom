import { create } from 'zustand'
import type { AuthUserProfile } from '@/types/auth'

const TOKEN_STORAGE_KEY = 'slush-access-token'

interface AuthState {
  accessToken: string | null
  user: AuthUserProfile | null
  setAccessToken: (token: string) => void
  setUser: (user: AuthUserProfile | null) => void
}

function readInitialToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch (err) {
    console.warn('[authStore] localStorage недоступен — токен не восстановлен', err)
    return null
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: readInitialToken(),
  user: null,
  setAccessToken: (token) => {
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch (err) {
      console.warn('[authStore] Не удалось сохранить токен', err)
    }
    set({ accessToken: token })
  },
  setUser: (user) => set({ user }),
}))
