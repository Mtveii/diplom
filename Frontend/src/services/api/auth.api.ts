import { httpClient } from './httpClient'
import { useAuthStore } from '@/store/authStore'
import type { AuthUserProfile } from '@/types/auth'

interface SlushLoginResponse {
  accessToken: string
  refreshToken: string
}

interface SlushProfileResponse {
  message: string
  userId: string
  email: string | null
  username: string | null
}

/** Достаём роль из claim'а JWT (System.Security.Claims.ClaimTypes.Role). */
function extractRoleFromJwt(token: string): string {
  try {
    const base64 = token.split('.')[1] ?? ''
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>
    const roleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    return (payload[roleClaim] as string | undefined) ?? (payload.role as string | undefined) ?? 'User'
  } catch (err) {
    console.warn('[authApi] Не удалось декодировать JWT — роль неизвестна', err)
    return 'User'
  }
}

export const authApi = {
  login: async (loginOrEmail: string, password: string): Promise<string> => {
    const response = await httpClient.post<SlushLoginResponse>(`/Auth/login`, {
      loginOrEmail,
      password,
      rememberMe: true,
    })
    return response.data.accessToken
  },

  logout: async (): Promise<void> => {
    try {
      await httpClient.post('/Auth/logout')
    } catch {
      // logout на бекенде опционален — локально всё равно чистим
    }
    useAuthStore.getState().logout()
  },

  me: async (): Promise<AuthUserProfile> => {
    const token = useAuthStore.getState().accessToken ?? ''
    const profile = await httpClient.get<SlushProfileResponse>(`/Profile/me`).then((r) => r.data)

    return {
      userId: profile.userId,
      email: profile.email,
      username: profile.username ?? profile.email ?? 'Администратор',
      role: extractRoleFromJwt(token),
    }
  },
}
