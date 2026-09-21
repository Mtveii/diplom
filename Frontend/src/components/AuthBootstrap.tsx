import { useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/services/api/auth.api'
import { isTokenExpired, useAuthStore } from '@/store/authStore'

/**
 * Экрана входа нет. В DEV-режиме тихо логинимся кредами из локального .env.local
 * (gitignored). В прод-сборке эта ветка вырезается по import.meta.env.DEV,
 * поэтому креды физически не могут попасть в dist-бандл.
 * Сохранённый токен переиспользуем. В проде — всегда анонимно.
 */
export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      if (!import.meta.env.DEV) {
        return
      }
      const stored = useAuthStore.getState().accessToken
      if (stored && !isTokenExpired(stored)) {
        return
      }
      useAuthStore.getState().clearAccessToken()
      const email = import.meta.env.VITE_AUTH_EMAIL
      const password = import.meta.env.VITE_AUTH_PASSWORD
      if (!email || !password) {
        return
      }
      try {
        const token = await authApi.login(email, password)
        if (!cancelled) {
          useAuthStore.getState().setAccessToken(token)
        }
      } catch (err) {
        console.warn('[AuthBootstrap] Тихий вход не удался — работаем анонимно', err)
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
