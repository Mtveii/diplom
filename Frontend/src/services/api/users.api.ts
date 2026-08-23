import { httpClient } from './httpClient'
import type { AdminUserDto } from '@/types/auth'

/** Сырая форма пользователя из Slush API (GET /Admin/users). */
interface SlushAdminUserDto {
  id: string
  username: string | null
  email: string | null
  isBanned: boolean
  role: string | null
  createdAt: string
}

export const usersApi = {
  getUsers: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<AdminUserDto[]> => {
    const raw = await httpClient
      .get<SlushAdminUserDto[]>('/Admin/users', { params: { searchTerm: params?.search } })
      .then((r) => r.data)
    return raw.map((user) => ({
      id: user.id,
      username: user.username ?? 'Без имени',
      email: user.email,
      role: user.role ?? 'User',
      isBanned: user.isBanned,
      createdAt: user.createdAt,
    }))
  },

  toggleBan: (userId: string) =>
    httpClient.post(`/Admin/users/${userId}/toggle-ban`).then((r) => r.data),
}
