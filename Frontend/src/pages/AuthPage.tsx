import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

const features = [
  {
    title: 'Мониторинг в реальном времени',
    text: 'Онлайн участников, активность и пульс клана — без задержек',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l3-8 4 16 3-8h6" />
      </svg>
    ),
  },
  {
    title: 'Умные алерты',
    text: 'Автоматические уведомления о падении активности и нарушениях',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    title: 'Аналитика и отчёты',
    text: 'Retention, когорты, отток — понимай, что происходит с кланом',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M7 13l4-4 4 4 5-5" />
      </svg>
    ),
  },
]

export default function AuthPage() {
  const { loginWithSteam, adminLogin } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSteamLogin = async () => {
    setError(null)
    try {
      await loginWithSteam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось начать вход через Steam')
    }
  }

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await adminLogin(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный логин или пароль')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-900 p-10 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/25 via-accent-600/15 to-transparent" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent-600/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-glow">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Steam Clan Admin</div>
            <div className="text-[11px] text-slate-400">Панель управления кланом</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight text-white">
            Управляй кланом
            <br />
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              на основе данных Steam
            </span>
          </h1>
          <div className="mt-8 flex flex-col gap-5">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 text-primary-400">
                  {feature.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{feature.title}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{feature.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[11px] text-slate-500">
          Дипломный проект · ASP.NET Core + React · 2026
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-surface-950 px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="text-lg font-bold text-white">Steam Clan Admin</div>
          </div>

          <div className="card-hud animate-fade-up rounded-2xl border border-surface-700 bg-surface-900/80 p-8 shadow-card backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white">Вход в панель</h2>
            <p className="mb-6 mt-1 text-sm text-slate-400">Войдите через Steam или по учётной записи администратора</p>

            <button
              onClick={() => void handleSteamLogin()}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-[#1b2838] bg-[#1b2838] py-3 text-sm font-semibold text-white transition-all hover:border-[#2a475e] hover:bg-[#2a475e] active:scale-[0.99]"
            >
              <svg className="h-4 w-4 text-[#66c0f4]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 0 0-9.93 11.35l3.08 1.3a3.4 3.4 0 0 1 4.6-.9l3.2-3.7a4.9 4.9 0 0 1 4.6-3.2 4.94 4.94 0 1 1-.33 9.87l-2.03 2.28A10 10 0 0 0 12 2zm8.33 6.1a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2zm-6.5 5.5-3.1 3.5a2.55 2.55 0 1 1-3.2.22l2.1 1.1a1.98 1.98 0 1 0 2.63-2.63l-2.1-1.1a2.55 2.55 0 0 1 3.67-1.1zm.5-6.5a1.63 1.63 0 1 0 0 3.25 1.63 1.63 0 0 0 0-3.25z" />
              </svg>
              Войти через Steam
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
              <div className="h-px flex-1 bg-surface-800" />
              или резервный вход
              <div className="h-px flex-1 bg-surface-800" />
            </div>

            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Логин администратора</label>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Например: admin"
                  autoComplete="username"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input w-full"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-300">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  {error}
                </div>
              )}
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {submitting ? 'Вход...' : 'Войти'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
