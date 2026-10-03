import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { canAccess, hasExactRole } from '@/utils/role'
import type { UserRole } from '@/types/auth'

interface RequireRoleProps {
  /** Ключ раздела из ROUTES_ACCESS (напр. "/members"). */
  path?: string
  /**
   * Именной вход: пускает только перечисленные роли (чужие видят 403).
   * Имеет приоритет над path.
   */
  roles?: UserRole[]
  children: ReactNode
}

/**
 * Своей формы входа у панели нет (логин живёт в Slush-Front, токен
 * подхватываем из shared storage). Access denied-экраны отключены —
 * без доступа просто ничего не показываем, без ошибок.
 */
export default function RequireRole({ path, roles, children }: RequireRoleProps) {
  const token = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)

  if (!token) {
    return null
  }

  const allowed = roles
    ? roles.some((expected) => hasExactRole(role, expected))
    : path != null && canAccess(path, role)

  if (allowed) {
    return <>{children}</>
  }

  return null
}
