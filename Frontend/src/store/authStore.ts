import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LoginResponse, UserDto, UserRole } from '@/types/auth'

interface AuthState {
  accessToken: string | null
  user: UserDto | null
  setAuth: (response: LoginResponse) => void
  setAccessToken: (token: string) => void
  setUser: (user: UserDto | null) => void
  logout: () => void
  hasRole: (required: UserRole[]) => boolean
}

const roleWeight: Record<UserRole, number> = {
  Viewer: 0,
  Analyst: 1,
  Moderator: 2,
  SuperAdmin: 3,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setAuth: (response) =>
        set({
          accessToken: response.accessToken,
          user: {
            id: response.userId,
            username: response.username,
            avatarUrl: response.avatarUrl,
            role: response.role,
            steamId64: '',
            createdAt: '',
            lastLoginAt: null,
          },
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null }),
      hasRole: (required) => {
        const role = get().user?.role
        if (!role) {
          return false
        }
        return required.some((r) => roleWeight[role] >= roleWeight[r])
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    },
  ),
)