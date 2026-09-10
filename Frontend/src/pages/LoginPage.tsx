import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { authApi } from '@/services/api/auth.api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { extractErrorMessage } from '@/services/api/httpClient'

export default function LoginPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [loginOrEmail, setLoginOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (accessToken && !useAuthStore.getState().isTokenExpired(accessToken)) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginOrEmail.trim() || !password) {
      toast.warning('Заполните логин и пароль')
      return
    }
    setLoading(true)
    try {
      const token = await authApi.login(loginOrEmail.trim(), password)
      useAuthStore.getState().setAccessToken(token)
      try {
        const profile = await authApi.me()
        useAuthStore.getState().setUser(profile)
      } catch {
        // профиль подтянет AuthBootstrap
      }
      toast.success('Вход выполнен')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error('Ошибка входа', extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b14] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-surface-700/60 bg-surface-900 p-6 shadow-card">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-glow">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="mt-3 text-lg font-bold text-white">Steam Users Admin</h1>
          <p className="mt-1 text-xs text-slate-400">Войдите, чтобы продолжить</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Логин или email</label>
            <input
              value={loginOrEmail}
              onChange={(e) => setLoginOrEmail(e.target.value)}
              placeholder="admin@slush.com"
              autoComplete="username"
              className="input h-10 w-full bg-surface-950 px-3 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="input h-10 w-full bg-surface-950 px-3 text-sm"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary h-10 w-full justify-center">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Доступ только для авторизованных администраторов
        </p>
      </div>
    </div>
  )
}
