import axios, { type AxiosError } from 'axios'
import { isTokenExpired, useAuthStore } from '@/store/authStore'
import { getLocaleDictionary } from '@/store/localeStore'
import { toast } from '@/store/toastStore'
import { API_BASE_URL } from './apiBase'

export { API_BASE_URL } from './apiBase'

// Экрана входа нет. Сохранённый токен (тихий DEV-вход) цепляется к запросам,
// без него — анонимно. Закрытые эндпоинты вернут 401 — страницы покажут пустые состояния.
const httpClient = axios.create({
  baseURL: API_BASE_URL + '/api',
  timeout: 15000,
})

httpClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    if (isTokenExpired(token)) {
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
    // Мёртвый токен чистим молча, редиректов нет.
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAccessToken()
    }
    // Токен валиден, но роли не хватает: фронт-гард пропустил (или роль сменили
    // на бэке уже после выдачи токена) — показываем 403 явно, не разлогиниваем.
    if (error.response?.status === 403) {
      toast.error(getLocaleDictionary().forbidden.heading)
    }
    return Promise.reject(error)
  },
)

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ title?: string; message?: string; errors?: Record<string, string[]> }>
  const data = axiosError.response?.data
  if (data?.errors) {
    const firstField = Object.values(data.errors)[0]?.[0]
    if (firstField) return firstField
  }
  return data?.message ?? data?.title ?? axiosError.message ?? getLocaleDictionary().common.requestError
}

export { httpClient, extractErrorMessage }
