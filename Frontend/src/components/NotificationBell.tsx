import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlerts } from '@/hooks/useAlerts'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { history, unreadCount, markAsRead, markAllAsRead } = useAlerts()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
          open
            ? 'border-primary-500/50 bg-surface-800 text-primary-400'
            : 'border-surface-700 text-slate-400 hover:bg-surface-800 hover:text-slate-200'
        }`}
        title="Алерты"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-scale-in items-center justify-center rounded-full bg-gradient-to-r from-danger-500 to-danger-600 px-1 text-[10px] font-bold text-white shadow-glow">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-96 animate-scale-in rounded-2xl border border-surface-700/60 bg-surface-900/70 shadow-card backdrop-blur-md lg:left-auto lg:right-0">
          <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
            <span className="text-sm font-semibold text-white">
              Алерты
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-primary-600/20 px-2 py-0.5 text-[10px] font-medium text-primary-400">
                  {unreadCount} новых
                </span>
              )}
            </span>
            <button
              onClick={() => void markAllAsRead()}
              className="text-xs text-primary-400 transition-colors hover:text-primary-300 hover:underline"
            >
              Прочитать все
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Пока нет алертов — клан спокоен
              </div>
            ) : (
              history.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => void markAsRead(alert.id)}
                  className={`block w-full border-b border-surface-700/60 px-4 py-3 text-left transition-colors hover:bg-surface-800/70 ${
                    alert.isRead ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {!alert.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger-400" />}
                    <span className={`truncate text-sm font-medium ${alert.isRead ? 'text-slate-300' : 'text-white'}`}>
                      {alert.ruleName}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {new Date(alert.triggeredAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{alert.message}</div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false)
              navigate('/games')
            }}
            className="block w-full border-t border-surface-700 px-4 py-2.5 text-center text-xs font-medium text-primary-400 transition-colors hover:bg-surface-800"
          >
            К мониторингу игр
          </button>
        </div>
      )}
    </div>
  )
}
