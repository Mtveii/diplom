import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '@/services/api/auth.api'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, user, setAuth, setUser, logout } = useAuthStore()

  const loginWithSteam = useCallback(async () => {
    const returnUrl = `${window.location.origin}/login/callback`
    const url = await authApi.getSteamLoginUrl(returnUrl)
    window.location.href = url
  }, [])

  const adminLogin = useCallback(
    async (username: string, password: string) => {
      const response = await authApi.adminLogin(username, password)
      setAuth(response)
      const profile = await authApi.me()
      setUser(profile)
      navigate('/', { replace: true })
    },
    [navigate, setAuth, setUser],
  )

  const handleSteamCallback = useCallback(
    async (queryString: string) => {
      const response = await authApi.handleSteamCallback(queryString)
      setAuth(response)
      const profile = await authApi.me()
      setUser(profile)
      navigate('/', { replace: true })
    },
    [navigate, setAuth, setUser],
  )

  const logoutUser = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }, [logout, navigate])

  useEffect(() => {
    if (accessToken && !user) {
      authApi
        .me()
        .then(setUser)
        .catch(() => logout())
    }
  }, [accessToken, user, setUser, logout])

  useEffect(() => {
    if (location.pathname === '/login/callback') {
      const query = location.search.startsWith('?') ? location.search.slice(1) : location.search
      void handleSteamCallback(query)
    }
  }, [location, handleSteamCallback])

  return { accessToken, user, loginWithSteam, adminLogin, logoutUser }
}