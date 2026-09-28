import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useLocale } from '@/hooks/useLocale'
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

const SLUSH_LOGIN_URL = import.meta.env.VITE_SLUSH_URL as string | undefined

/**
 * Своей формы входа у панели нет (логин живёт в Slush-Front, токен
 * подхватываем из shared storage). Без токена — подсказка войти через
 * Slush, с чужой ролью — 403. Гостей нет.
 */
export default function RequireRole({ path, roles, children }: RequireRoleProps) {
  const token = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)
  const { t } = useLocale()

  if (!token) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <div className="bg-gradient-to-br from-primary-400 to-primary-600 bg-clip-text text-6xl font-extrabold text-transparent">
          {t.forbidden.title}
        </div>
        <h1 className="text-base sm:text-xl font-bold text-white">{t.forbidden.heading}</h1>
        <p className="text-xs sm:text-sm text-slate-400">{t.forbidden.authHint}</p>
        {SLUSH_LOGIN_URL ? (
          <a href={SLUSH_LOGIN_URL} className="btn-primary mt-2 h-9 px-4 text-sm">
            {t.login.submit}
          </a>
        ) : null}
      </div>
    )
  }

  const allowed = roles
    ? roles.some((expected) => hasExactRole(role, expected))
    : path != null && canAccess(path, role)

  if (allowed) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="bg-gradient-to-br from-primary-400 to-primary-600 bg-clip-text text-6xl font-extrabold text-transparent">
        {t.forbidden.title}
      </div>
      <h1 className="text-base sm:text-xl font-bold text-white">{t.forbidden.heading}</h1>
      <p className="text-xs sm:text-sm text-slate-400">
        {t.forbidden.hint}
        {role ? ` (${role})` : null}
      </p>
      <Link to="/" className="btn-primary mt-2 h-9 px-4 text-sm">
        {t.notFound.home}
      </Link>
    </div>
  )
}
