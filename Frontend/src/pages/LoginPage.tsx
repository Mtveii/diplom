import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authApi } from '@/services/api/auth.api'
import { useLocale } from '@/hooks/useLocale'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { extractErrorMessage } from '@/services/api/httpClient'

/**
 * Единственный вход в панель. Без токена все разделы ведут сюда —
 * гостевого доступа нет, только 4 роли.
 */
export default function LoginPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.accessToken)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (token) {
    return <Navigate to="/" replace />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !login.trim() || !password) {
      return
    }
    setBusy(true)
    try {
      const accessToken = await authApi.login(login.trim(), password)
      useAuthStore.getState().setAccessToken(accessToken)
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface-950 p-4">
      <form
        onSubmit={(event) => void submit(event)}
        className="card card-hud w-full max-w-sm p-6 sm:p-8"
      >
        <div className="mb-1 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-glow">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="text-base font-bold tracking-tight text-white">{t.common.appName}</div>
        </div>
        <h1 className="mt-4 text-lg font-bold text-white">{t.login.title}</h1>
        <p className="mt-0.5 text-xs text-slate-400">{t.login.subtitle}</p>
        <label className="mt-5 block text-xs font-medium text-slate-400">
          {t.login.loginLabel}
          <input
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder={t.login.loginPh}
            autoComplete="username"
            className="input mt-1 h-10 w-full bg-surface-950 px-3 text-sm"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-slate-400">
          {t.login.passwordLabel}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t.login.passwordPh}
            autoComplete="current-password"
            className="input mt-1 h-10 w-full bg-surface-950 px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !login.trim() || !password}
          className="btn-primary mt-5 h-10 w-full text-sm disabled:opacity-50"
        >
          {busy ? '…' : t.login.submit}
        </button>
      </form>
    </div>
  )
}
