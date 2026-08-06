import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { authApi } from '@/services/api/auth.api'
import { useAuthStore } from '@/store/authStore'
import NotificationBell from './NotificationBell'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const iconClass = 'h-[18px] w-[18px]'

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Дашборд',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l9-9 9 9" />
        <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
      </svg>
    ),
  },
  {
    to: '/members',
    label: 'Участники',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/applications',
    label: 'Заявки',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
    ),
  },
  {
    to: '/games',
    label: 'Мониторинг игр',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12h4" />
        <path d="M14 12h.01" />
        <path d="M17 12h.01" />
        <path d="M6 16h4" />
        <path d="M14 16h.01" />
        <path d="M6 8h4" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Аналитика',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M7 13l4-4 4 4 5-5" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Настройки',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuthStore()
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      logout()
    }
  }

  return (
    <div className="flex min-h-screen text-slate-100">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-surface-700/70 bg-surface-900/60 px-4 py-6 backdrop-blur lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-glow">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">Steam Clan Admin</div>
            <div className="text-[11px] text-slate-400">Панель управления</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-primary-500 font-semibold text-surface-950 shadow-glow'
                    : 'text-slate-400 hover:bg-surface-800 hover:text-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-surface-950" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-2">
          <div className="rounded-xl border border-surface-700 bg-surface-800/40 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success-400" />
              <span className="text-xs text-slate-300">API подключено</span>
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Мониторинг обновляется каждую минуту
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-surface-700/70 bg-surface-950/70 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="text-sm font-bold">Steam Clan Admin</div>
          </div>

          <div className="hidden items-center gap-1 overflow-x-auto lg:flex lg:flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-500 text-surface-950'
                      : 'text-slate-400 hover:bg-surface-800 hover:text-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex flex-1 items-center justify-end gap-4 lg:flex-none">
            <NotificationBell />
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="h-9 w-9 rounded-full border border-surface-700" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="text-sm font-medium leading-tight">{user?.username}</div>
                <div className="text-[11px] text-slate-400">{user?.role}</div>
              </div>
              <button
                onClick={() => void handleLogout()}
                title="Выйти"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-700 text-slate-400 transition-colors hover:border-rose-700 hover:bg-rose-950/40 hover:text-rose-300"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 animate-fade-up p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
