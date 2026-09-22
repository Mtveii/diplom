import { httpClient } from './httpClient'
import { getLocaleDictionary } from '@/store/localeStore'
import type { AdminUserDto, UserRole } from '@/types/auth'

/**
 * Маппінг ролей на int-enum Slush API — ТОЧНО за Slush.Domain.Enums.UserRole:
 * User = 0, Analyst = 1, Moderator = 2, Admin = 3, SuperAdmin = 4.
 * (Раніше тут був неправильний порядок з історії проєкту — виправлено.)
 */
const USER_ROLE_TO_INT: Record<UserRole, number> = {
  SuperAdmin: 4,
  Admin: 3,
  Moderator: 2,
  Analyst: 1,
}

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
    const fallbackName = getLocaleDictionary().common.noName
    return raw.map((user) => ({
      id: user.id,
      username: user.username ?? fallbackName,
      email: user.email,
      role: user.role ?? 'User',
      isBanned: user.isBanned,
      createdAt: user.createdAt,
    }))
  },

  toggleBan: (userId: string) =>
    httpClient.post(`/Admin/users/${userId}/toggle-ban`).then((r) => r.data),

  setRole: (userId: string, role: UserRole) =>
    httpClient.put(`/Admin/users/${userId}/role`, { newRole: USER_ROLE_TO_INT[role] }).then((r) => r.data),
}
