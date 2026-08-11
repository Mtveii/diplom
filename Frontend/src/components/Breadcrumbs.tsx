import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

const LABELS: Record<string, string> = {
  '': 'Дашборд',
  members: 'Участники',
  applications: 'Заявки',
  games: 'Мониторинг игр',
  analytics: 'Аналитика',
  settings: 'Настройки',
}

interface BreadcrumbsProps {
  children?: ReactNode
}

export default function Breadcrumbs({ children }: BreadcrumbsProps) {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  const renderCrumb = (key: string) => LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)

  return (
    <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Хлебные крошки">
      <Link to="/" className="shrink-0 text-slate-400 transition-colors hover:text-white">
        Дашборд
      </Link>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        const to = `/${segments.slice(0, index + 1).join('/')}`
        return (
          <span key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1.5">
            <svg className="h-3.5 w-3.5 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
            {isLast ? (
              <span className="truncate font-medium text-white">{children ?? renderCrumb(segment)}</span>
            ) : (
              <Link to={to} className="shrink-0 text-slate-400 transition-colors hover:text-white">
                {renderCrumb(segment)}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
