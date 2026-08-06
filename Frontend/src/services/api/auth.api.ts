import { httpClient } from './httpClient'
import type { LoginResponse, UserDto } from '@/types/auth'

export const authApi = {
  getSteamLoginUrl: (returnUrl?: string) =>
    httpClient.get<{ url: string }>('/auth/steam-url', { params: { returnUrl } }).then((r) => r.data.url),

  adminLogin: (username: string, password: string) =>
    httpClient.post<LoginResponse>('/auth/login', { username, password }).then((r) => r.data),

  handleSteamCallback: (queryString: string) =>
    httpClient.get<LoginResponse>(`/auth/steam/callback?${queryString}`).then((r) => r.data),

  logout: () => httpClient.post('/auth/logout'),

  me: () => httpClient.get<UserDto>('/auth/me').then((r) => r.data),
}