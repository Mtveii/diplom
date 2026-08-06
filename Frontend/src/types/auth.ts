export type UserRole = 'Viewer' | 'Analyst' | 'Moderator' | 'SuperAdmin'

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  userId: number
  username: string
  avatarUrl: string
  role: UserRole
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