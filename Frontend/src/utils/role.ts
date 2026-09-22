import type { UserRole } from '@/types/auth'

/** Роли, которым выдаём доступ. Всё остальное (напр. "User" с бэкенда) — только публичные разделы. */
export const KNOWN_ROLES: readonly UserRole[] = ['SuperAdmin', 'Admin', 'Moderator', 'Analyst']

/** Claim с ролью в JWT Slush API (ASP.NET Core Identity-стиль). Проверен живым токеном. */
export const JWT_ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

/** Числові рівні допуску: чим вище, тим більше розділів. 0 — анонім/невідома роль. */
export const ROLE_LEVEL: Record<UserRole, number> = {
  Analyst: 1,
  Moderator: 2,
  Admin: 3,
  SuperAdmin: 4,
}

/** Рівень допуску ролі з JWT. Невідомі ролі й аноніми — 0. */
export function getRoleLevel(role: string | null | undefined): number {
  if (!isKnownRole(role)) {
    return 0
  }
  return ROLE_LEVEL[role]
}

export interface TokenIdentity {
  userId: string
  username: string | null
}

/** sub + unique_name из токена — нужно, чтобы узнать себя при смене ролей. */
export function decodeIdentityFromToken(token: string | null | undefined): TokenIdentity | null {
  if (!token) {
    return null
  }
  const payload = decodePayload(token)
  const sub = payload?.sub
  if (typeof sub !== 'string' || sub.length === 0) {
    return null
  }
  const username = payload?.unique_name
  return { userId: sub, username: typeof username === 'string' ? username : null }
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1] ?? ''
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Роль из accessToken. Отдельной jwt-библиотеки нет специально:
 * в проекте уже используется такой же ручной decode (authStore.isTokenExpired).
 * Неизвестное/отсутствующее значение → null.
 */
export function decodeRoleFromToken(token: string | null | undefined): string | null {
  if (!token) {
    return null
  }
  const payload = decodePayload(token)
  if (!payload) {
    return null
  }
  const raw = payload.role ?? payload[JWT_ROLE_CLAIM]
  if (typeof raw === 'string' && raw.length > 0) {
    return raw
  }
  if (Array.isArray(raw)) {
    return raw.find((value): value is string => typeof value === 'string' && value.length > 0) ?? null
  }
  return null
}

export function isKnownRole(role: string | null | undefined): role is UserRole {
  return typeof role === 'string' && (KNOWN_ROLES as readonly string[]).includes(role)
}

/**
 * Карта доступов по разделам. Сверена с [Authorize] бэкенда (SlushBackend):
 * Admin-контроллер: SuperAdmin/Admin/Moderator (PUT роли — только SuperAdmin);
 * SuperAdmin/Admin; Analytics/Monitoring: +Analyst; Catalog: анонимно.
 * Это только UX-гейты: последнее слово за бэкендом (401/403).
 */
export const ROUTES_ACCESS: Record<string, readonly UserRole[]> = {
  '/': ['SuperAdmin', 'Admin', 'Moderator', 'Analyst'],
  '/members': ['SuperAdmin', 'Admin', 'Moderator'],
  '/games': ['SuperAdmin', 'Admin', 'Moderator', 'Analyst'],
  '/analytics': ['SuperAdmin', 'Admin', 'Analyst'],
  '/command-center': ['SuperAdmin', 'Admin'],
  '/settings': ['SuperAdmin', 'Admin'],
}

function matchRoute(path: string): string | null {
  const normalized = path.split('?')[0].replace(/\/+$/, '') || '/'
  if (normalized in ROUTES_ACCESS) {
    return normalized
  }
  const prefix = Object.keys(ROUTES_ACCESS).find(
    (key) => key !== '/' && normalized.startsWith(`${key}/`),
  )
  return prefix ?? null
}

/**
 * Можно ли роли открыть путь. Гостей нет: без токена и с неизвестной
 * ролью (напр. "User") закрыто всё — вход только через логин.
 */
export function canAccess(path: string, role: string | null | undefined): boolean {
  const key = matchRoute(path)
  if (!key || !isKnownRole(role)) {
    return false
  }
  return ROUTES_ACCESS[key].includes(role)
}

/** Алерты (создание правил): только SuperAdmin и Admin. */
export function canManageAlerts(role: string | null | undefined): boolean {
  return role === 'SuperAdmin' || role === 'Admin'
}

/** Смена ролей пользователям: только SuperAdmin. */
export function canManageRoles(role: string | null | undefined): boolean {
  return role === 'SuperAdmin'
}

/** Минимальная форма пользователя для проверки «последнего суперадмина». */
export interface RoleHolder {
  id: string
  role: string
  isBanned: boolean
}

/** Действующий суперадмин (забаненные не в счёт — они не действуют). */
export function isEffectiveSuperAdmin(user: RoleHolder): boolean {
  return user.role === 'SuperAdmin' && !user.isBanned
}

/** Есть ли другой действующий суперадмин кроме указанного. */
export function hasOtherEffectiveSuperAdmin(users: readonly RoleHolder[], userId: string): boolean {
  return users.some((user) => user.id !== userId && isEffectiveSuperAdmin(user))
}

/** Это текущий пользователь (по sub или username из токена)? */
export function isSelfIdentity(
  self: TokenIdentity | null,
  user: { id: string; username?: string | null },
): boolean {
  if (!self) {
    return false
  }
  if (self.userId === user.id) {
    return true
  }
  return self.username !== null && user.username != null && self.username === user.username
}

/**
 * Можно ли банить цель. Правила SlushBackend (AdminController.ToggleBan):
 * себя — нельзя; Admin/SuperAdmin — только суперадмин.
 */
export function canBanUser(
  currentRole: string | null | undefined,
  target: RoleHolder & { username?: string | null },
  self: TokenIdentity | null,
): boolean {
  if (isSelfIdentity(self, target)) {
    return false
  }
  if ((target.role === 'Admin' || target.role === 'SuperAdmin') && currentRole !== 'SuperAdmin') {
    return false
  }
  return true
}

/** Вкладки аудита/безопасности в настройках: SuperAdmin и Admin. */
export function canViewSecurity(role: string | null | undefined): boolean {
  return role === 'SuperAdmin' || role === 'Admin'
}
