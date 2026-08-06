import { httpClient } from './httpClient'
import type { PagedResult, UserDto, UserRole } from '@/types/auth'

export const usersApi = {
  getUsers: (params?: { page?: number; pageSize?: number; search?: string }) =>
    httpClient.get<PagedResult<UserDto>>('/users', { params }).then((r) => r.data),

  updateRole: (id: number, role: UserRole) =>
    httpClient.put<UserDto>(`/users/${id}/role`, { role }).then((r) => r.data),
}