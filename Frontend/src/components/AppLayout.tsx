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
    to: '/command-center',
    label: 'Командный центр',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Настройки',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0-1.51 1z" />
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
  const [appBadge, setAppBadge] = useState(0)
  const [alertBadge, setAlertBadge] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const connectionStatus = useConnectionStatus()

  const canModerate = hasRole(['Moderator', 'SuperAdmin'])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

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
        // бейджи некритичны
      }
    }
    void loadBadges()
  }, [canModerate, location.pathname])

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-100">
      <div className="flex w-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-surface-700/60 bg-surface-900/40 px-4 py-2.5 backdrop-blur-md sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-700 text-slate-300 transition-colors hover:bg-surface-800 lg:hidden"
              aria-label="Меню навигации"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileNavOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
              </svg>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-glow">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold tracking-tight text-white">Steam Clan Admin</div>
                <div className="text-[10px] text-slate-400">Dashboard</div>
              </div>
            </div>
            <div className="hidden min-w-0 lg:block lg:ml-4">
              <Breadcrumbs />
            </div>
          </div>

          <div className="hidden items-center gap-1.5 overflow-x-auto lg:flex lg:flex-1 lg:justify-center">
            {navItems.map((item) => {
              const badge = item.to === '/applications' ? appBadge : item.to === '/games' ? alertBadge : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors relative ${
                      isActive
                        ? 'bg-primary-500 text-surface-950 font-semibold shadow-glow'
                        : 'text-slate-300 hover:bg-surface-800 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                  {badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[9px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`hidden items-center gap-1.5 text-xs sm:flex ${
                connectionStatus === 'live' ? 'text-success-400' : 'text-warning-400'
              }`}
            >
              <span
                className={`live-dot ${
                  connectionStatus === 'live' ? '' : connectionStatus === 'reconnecting' ? 'live-dot--warn' : 'live-dot--off'
                }`}
              />
              {connectionStatus === 'live' ? 'Live' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
            </span>
            <NotificationBell />
            <UserMenu panelPosition="right" />
          </div>
        </header>

        {mobileNavOpen && (
          <div className="absolute inset-x-0 top-[65px] z-50 border-b border-surface-700 bg-surface-950/95 p-4 shadow-card backdrop-blur-md animate-scale-in lg:hidden">
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const badge = item.to === '/applications' ? appBadge : item.to === '/games' ? alertBadge : 0
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-500 text-surface-950 shadow-glow font-semibold'
                          : 'text-slate-300 hover:bg-surface-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <span className={isActive ? 'text-surface-950' : 'text-slate-400'}>{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        {badge > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-600 px-1.5 text-xs font-bold text-white">
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        )}

        <main className="w-full min-h-0 flex-1 animate-fade-up p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
