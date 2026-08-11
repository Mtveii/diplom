import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { alertsApi } from '@/services/api/alerts.api'
import { applicationsApi } from '@/services/api/members.api'
import { onReconnected, onReconnecting } from '@/services/signalr'
import { useAuthStore } from '@/store/authStore'
import Breadcrumbs from './Breadcrumbs'
import NotificationBell from './NotificationBell'
import UserMenu from './UserMenu'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  badge?: number
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

type ConnectionStatus = 'live' | 'reconnecting' | 'offline'

function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('live')

  useEffect(() => {
    onReconnecting(() => setStatus('reconnecting'))
    onReconnected(() => setStatus('live'))
    const goOffline = () => setStatus('offline')
    const goOnline = () => setStatus('live')
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      onReconnecting(() => undefined)
      onReconnected(() => undefined)
    }
  }, [])

  return status
}

export default function AppLayout({ children }: AppLayoutProps) {
  const hasRole = useAuthStore((state) => state.hasRole)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1')
  const [appBadge, setAppBadge] = useState(0)
  const [alertBadge, setAlertBadge] = useState(0)
  const connectionStatus = useConnectionStatus()

  const canModerate = hasRole(['Moderator', 'SuperAdmin'])

  useEffect(() => {
    const loadBadges = async () => {
      try {
        const [apps, alerts] = await Promise.all([
          canModerate ? applicationsApi.getAll() : Promise.resolve([]),
          alertsApi.unreadCount(),
        ])
        setAppBadge(apps.filter((app) => app.status === 'Pending').length)
        setAlertBadge(alerts)
      } catch {
        // бейджи некритичны — при ошибке просто не показываем
      }
    }
    void loadBadges()
  }, [canModerate, location.pathname])

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-100">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-surface-700/50 bg-surface-900/70 px-3 py-6 backdrop-blur-md transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-[76px]' : 'w-[280px]'
        }`}
      >
        <div className={`mb-8 flex items-center gap-3 ${collapsed ? 'justify-center px-0' : 'px-2'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-glow">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-white">Steam Clan Admin</div>
              <div className="text-[11px] text-slate-400">Панель управления</div>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const badge = item.to === '/applications' ? appBadge : item.to === '/games' ? alertBadge : 0
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl py-3 text-sm transition-all duration-200 ${
                    collapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      ? 'bg-primary-500 font-semibold text-surface-950 shadow-glow'
                      : 'text-slate-400 hover:bg-surface-800/70 hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>
                      {item.icon}
                    </span>
                    {!collapsed && item.label}
                    {badge > 0 && (
                      <span
                        className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-danger-500 to-danger-600 px-1 text-[10px] font-bold text-white ${
                          collapsed ? 'absolute right-1 top-1' : 'ml-auto'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-600" />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар'}
          className={`mt-6 flex items-center gap-2 rounded-xl border border-surface-700/60 py-2 text-xs text-slate-500 transition-colors hover:border-primary-500/40 hover:text-slate-300 ${
            collapsed ? 'justify-center' : 'justify-center gap-1'
          }`}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {!collapsed && 'Свернуть'}
        </button>

        <div className="mt-auto">
          {!collapsed && (
            <div className="mb-3 rounded-xl border border-surface-700/60 bg-surface-800/20 p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success-400" />
                <span className="text-xs text-slate-300">Steam Connected</span>
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {connectionStatus === 'live'
                  ? 'Мониторинг обновляется каждую минуту'
                  : connectionStatus === 'reconnecting'
                    ? 'Переподключение...'
                    : 'Нет соединения'}
              </div>
            </div>
          )}
          <div className={collapsed ? 'flex justify-center' : ''}>
            <UserMenu showDetails={!collapsed} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-surface-700/60 bg-surface-900/30 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 lg:block">
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-2 lg:hidden">
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
            <span
              className={`hidden items-center gap-1.5 text-xs sm:flex ${
                connectionStatus === 'live' ? 'text-success-400' : 'text-warning-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connectionStatus === 'live' ? 'animate-pulse-dot bg-success-400' : 'animate-pulse bg-warning-400'
                }`}
              />
              {connectionStatus === 'live' ? 'Live' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
            </span>
            <NotificationBell />
            <UserMenu panelPosition="right" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] min-h-0 flex-1 animate-fade-up p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
