import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/services/api/auth.api'
import { useAuthStore } from '@/store/authStore'

interface UserMenuProps {
  showDetails?: boolean
  panelPosition?: 'left' | 'right'
}

export default function UserMenu({ showDetails = true, panelPosition = 'left' }: UserMenuProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    try {
      await authApi.logout()
    } finally {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-xl border border-transparent transition-colors hover:border-surface-700 hover:bg-surface-800/60 ${
          showDetails ? 'px-2 py-1.5' : 'p-1'
        }`}
        title="Меню пользователя"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full border border-surface-700" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
            {user?.username.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}
        {showDetails && (
          <>
            <span className="hidden text-left md:block">
              <span className="block max-w-[140px] truncate text-sm font-medium leading-tight text-slate-100">{user?.username}</span>
              <span className="block text-[11px] text-slate-400">{user?.role}</span>
            </span>
            <svg className="hidden h-3.5 w-3.5 text-slate-500 md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-48 animate-scale-in rounded-xl border border-surface-700/60 bg-surface-900/90 p-1.5 shadow-card backdrop-blur-md ${
            panelPosition === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="border-b border-surface-700 px-3 py-2.5">
            <div className="truncate text-sm font-medium text-white">{user?.username ?? 'Гость'}</div>
            <div className="text-[11px] text-slate-500">{user?.role}</div>
          </div>
          <div className="pt-1.5">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/profile')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-surface-800 hover:text-white"
            >
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Профиль
            </button>
            <button
              onClick={() => {
                setOpen(false)
                navigate('/settings')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-surface-800 hover:text-white"
            >
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </button>
            <button
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-950/50 hover:text-rose-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
