import type { ReactNode } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { useAuthStore } from '@/store/authStore'
import { canAccess, hasExactRole } from '@/utils/role'
import { getSlushLoginUrl } from '@/utils/slush'
import type { UserRole } from '@/types/auth'

interface RequireRoleProps {
  /** Ключ раздела из ROUTES_ACCESS (напр. "/members"). */
  path?: string
  /**
   * Именной вход: пускает только перечисленные роли (чужих не показываем).
   * Имеет приоритет над path.
   */
  roles?: UserRole[]
  children: ReactNode
}

/**
 * Своей формы входа у панели нет: вход только через панель Slush-Front
 * (дефолт или VITE_SLUSH_URL, токен подхватываем из shared storage или адреса).
 * Без токена — кнопка на панель входа Slush. Access denied-экраны отключены —
 * с чужой ролью просто ничего не показываем, без ошибок. Гостей нет.
 */
export default function RequireRole({ path, roles, children }: RequireRoleProps) {
  const token = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)
  const { t } = useLocale()

  if (!token) {
    const slushLoginUrl = getSlushLoginUrl()
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <div className="bg-gradient-to-br from-primary-400 to-primary-600 bg-clip-text text-6xl font-extrabold text-transparent">
          {t.forbidden.title}
        </div>
        <h1 className="text-base sm:text-xl font-bold text-white">{t.forbidden.heading}</h1>
        <p className="text-xs sm:text-sm text-slate-400">{t.forbidden.authHint}</p>
        <a href={slushLoginUrl} className="btn-primary mt-2 h-9 px-4 text-sm">
          {t.login.submit}
        </a>
      </div>
    )
  }

  const allowed = roles
    ? roles.some((expected) => hasExactRole(role, expected))
    : path != null && canAccess(path, role)

  if (allowed) {
    return <>{children}</>
  }

  return null
}
