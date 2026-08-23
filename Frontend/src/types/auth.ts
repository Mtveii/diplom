export type UserRole = 'Viewer' | 'Analyst' | 'Moderator' | 'SuperAdmin'

/** Текущий пользователь (GET /Profile/me + роль из JWT). */
export interface AuthUserProfile {
  userId: string
  email: string | null
  username: string | null
  role: string
}

/** Пользователь сети Slush (GET /Admin/users). */
export interface AdminUserDto {
  id: string
  username: string
  email: string | null
  role: string
  isBanned: boolean
  createdAt: string
}

export interface UserDto {
  id: number
  steamId64: string
  username: string
  avatarUrl: string
  role: UserRole
  createdAt: string
  lastLoginAt: string | null
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}
