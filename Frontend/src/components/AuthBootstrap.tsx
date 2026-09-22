import { useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/services/api/auth.api'
import { isTokenExpired, useAuthStore } from '@/store/authStore'
import { extractTokenFromUrl } from '@/utils/role'

/**
 * Порядок входа:
 * 1. Токен из адреса (?token= / #access_token=) — Slush-Front передаёт ключ
 *    при редиректе на другом домене. Забираем в свой ключ, из адреса стираем.
 * 2. Сохранённый токен (свой ключ или shared-ключи Slush-Front).
 * 3. Только DEV: тихий вход кредами из локального .env.local (gitignored).
 * Своей формы входа у панели нет — она живёт в Slush-Front.
 */
export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const consumeUrlToken = (): boolean => {
      const fromUrl = extractTokenFromUrl(window.location.search, window.location.hash)
      if (!fromUrl || isTokenExpired(fromUrl)) {
        return false
      }
      useAuthStore.getState().setAccessToken(fromUrl)
      // Ключ в адресе больше не нужен — стираем, чтобы не светился и не уехал в историю/Referer.
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        const keptHash = url.hash
          .replace(/^#/, '')
          .split('&')
          .filter((part) => !/^(access_token|token)=/.test(part))
          .join('&')
        url.hash = keptHash ? `#${keptHash}` : ''
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
      } catch {
        // ignore — некритично
      }
      return true
    }

    const bootstrap = async () => {
      if (consumeUrlToken()) {
        return
      }
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
        console.warn('[AuthBootstrap] Тихий вход не удался — нужна ссылка со Slush', err)
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
