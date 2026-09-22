import { Link, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { useAuthStore } from '@/store/authStore'
import { canAccess } from '@/utils/role'

interface RequireRoleProps {
  /** Ключ раздела из ROUTES_ACCESS (напр. "/members"). */
  path: string
  children: ReactNode
}

/**
 * Гостей нет: без токена — на экран логина, с чужой ролью — панель 403.
 */
export default function RequireRole({ path, children }: RequireRoleProps) {
  const token = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)
  const { t } = useLocale()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (canAccess(path, role)) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="bg-gradient-to-br from-primary-400 to-primary-600 bg-clip-text text-6xl font-extrabold text-transparent">
        {t.forbidden.title}
      </div>
      <h1 className="text-base sm:text-xl font-bold text-white">{t.forbidden.heading}</h1>
      <p className="text-xs sm:text-sm text-slate-400">{t.forbidden.hint}</p>
      <Link to="/" className="btn-primary mt-2 h-9 px-4 text-sm">
        {t.notFound.home}
      </Link>
    </div>
  )
}
