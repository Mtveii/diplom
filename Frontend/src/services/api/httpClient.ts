import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const httpClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

type RefreshableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = axios
    .post<{ accessToken: string }>('/api/auth/refresh', null, { withCredentials: true })
    .then((response) => {
      const accessToken = response.data.accessToken
      useAuthStore.getState().setAccessToken(accessToken)
      return accessToken
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

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

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RefreshableRequestConfig | undefined
    const isAuthEndpoint = config?.url?.includes('/auth/') ?? false

    if (error.response?.status === 401 && config && !config._retry && !isAuthEndpoint) {
      config._retry = true
      try {
        const token = await refreshAccessToken()
        config.headers.Authorization = `Bearer ${token}`
        return httpClient(config)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export { httpClient, extractErrorMessage }