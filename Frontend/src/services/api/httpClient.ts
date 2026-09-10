import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'
import { API_BASE_URL } from './apiBase'

export { API_BASE_URL } from './apiBase'

const httpClient = axios.create({
  baseURL: API_BASE_URL + '/api',
  timeout: 15000,
})

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ title?: string; message?: string; errors?: Record<string, string[]> }>
  const data = axiosError.response?.data
  if (data?.errors) {
    const firstField = Object.values(data.errors)[0]?.[0]
    if (firstField) return firstField
  }
  return data?.message ?? data?.title ?? axiosError.message ?? 'Ошибка запроса к серверу'
}

httpClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    if (useAuthStore.getState().isTokenExpired(token)) {
      useAuthStore.getState().clearAccessToken()
    } else {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined

    // 401 — токен истёк или невалиден. Сбрасываем состояние, редиректим на /login.
    // Автологин по VITE_ кредам удалён — это была критическая уязвимость (креды в бандле).
    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true
      const isAuthRequest = config.url?.includes('/Auth/login')
      if (!isAuthRequest) {
        useAuthStore.getState().clearAccessToken()
        // Мягкий редирект без потери истории, если мы не на /login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  },
)

export { httpClient, extractErrorMessage }
