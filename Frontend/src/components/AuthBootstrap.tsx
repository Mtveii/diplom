import { useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/services/api/auth.api'
import { useAuthStore } from '@/store/authStore'

/**
 * Молчаливый bootstrap-токен перед первым рендером:
 * 1) ?token=... в URL — токен, переданный внешним сайтом авторизации;
 * 2) иначе автоматический вход через VITE_AUTH_EMAIL / VITE_AUTH_PASSWORD.
 * Экран логина в админке не предусмотрен (логин живёт на отдельном сайте).
 */
export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const store = useAuthStore.getState()

      const urlParams = new URLSearchParams(window.location.search)
      const tokenFromUrl = urlParams.get('token')
      if (tokenFromUrl) {
        store.setAccessToken(tokenFromUrl)
        urlParams.delete('token')
        const cleaned = `${window.location.pathname}${urlParams.size > 0 ? `?${urlParams}` : ''}`
        window.history.replaceState(null, '', cleaned)
      }

      if (useAuthStore.getState().accessToken) {
        await loadProfile()
        return
      }

      try {
        await relogin()
      } catch (err) {
        console.warn('[AuthBootstrap] Автоматический вход не выполнен — API будет недоступен', err)
        return
      }
      await loadProfile()
    }

    const loadProfile = async () => {
      try {
        const profile = await authApi.me()
        if (!cancelled) {
          useAuthStore.getState().setUser(profile)
        }
      } catch (err) {
        console.warn('[AuthBootstrap] Не удалось загрузить профиль (/Profile/me)', err)
      }
    }

    const relogin = async () => {
      const email = import.meta.env.VITE_AUTH_EMAIL
      const password = import.meta.env.VITE_AUTH_PASSWORD
      if (!email || !password) {
        throw new Error('VITE_AUTH_EMAIL / VITE_AUTH_PASSWORD не заданы')
      }
      const token = await authApi.login(email, password)
      if (!cancelled) {
        useAuthStore.getState().setAccessToken(token)
      }
    }

    void bootstrap().finally(() => {
      if (!cancelled) {
        setReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return null
  }

  return <>{children}</>
}
