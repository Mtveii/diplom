import axios, { type AxiosError } from 'axios'
import { authApi } from './auth.api'
import { useAuthStore } from '@/store/authStore'

export { API_BASE_URL } from './apiBase'
import { API_BASE_URL } from './apiBase'

const httpClient = axios.create({
  baseURL: API_BASE_URL + '/api',
})

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ title?: string }>
  return axiosError.response?.data?.title ?? 'Ошибка запроса к серверу'
}

httpClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let reloginPromise: Promise<string> | null = null

async function reloginWithEnvCredentials(): Promise<string> {
  const email = import.meta.env.VITE_AUTH_EMAIL
  const password = import.meta.env.VITE_AUTH_PASSWORD
  if (!email || !password) {
    throw new Error('Нет сохранённого токена и учётных данных для автоматического входа')
  }
  if (!reloginPromise) {
    reloginPromise = authApi.login(email, password)
      .then((token) => {
        useAuthStore.getState().setAccessToken(token)
        return token
      })
      .finally(() => {
        reloginPromise = null
      })
  }
  return reloginPromise
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined

    // Истёк/невалиден токен — один раз пробуем молча перелогиниться и повторить запрос.
    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true
      try {
        await reloginWithEnvCredentials()
        return httpClient(config)
      } catch (reloginError) {
        console.warn('[httpClient] Не удалось обновить токен — запрос отклонён', reloginError)
      }
    }

    return Promise.reject(error)
  },
)

export { httpClient, extractErrorMessage }
