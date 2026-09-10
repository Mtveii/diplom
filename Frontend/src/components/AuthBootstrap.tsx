import { useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/services/api/auth.api'
import { useAuthStore } from '@/store/authStore'

/**
 * Загружает профиль при наличии токена. Не использует ?token= из URL (утечка в Referer/логи)
 * и не делает автологин по VITE_ кредам (креды в бандле — критическая уязвимость).
 * Если токена нет — пользователь уйдёт на /login через ProtectedRoute.
 */
export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const token = useAuthStore.getState().accessToken
      if (!token) {
        return
      }
      if (useAuthStore.getState().isTokenExpired(token)) {
        useAuthStore.getState().clearAccessToken()
        return
      }
      try {
        const profile = await authApi.me()
        if (!cancelled) {
          useAuthStore.getState().setUser(profile)
        }
      } catch (err) {
        console.warn('[AuthBootstrap] Не удалось загрузить профиль (/Profile/me)', err)
        if (!cancelled) {
          // Токен битый — чистим, чтобы ProtectedRoute отправил на логин
          useAuthStore.getState().clearAccessToken()
        }
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
