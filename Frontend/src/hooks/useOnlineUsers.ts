import { useCallback, useEffect, useState } from 'react'
import { monitoringApi } from '@/services/api/monitoring.api'
import type { OnlineUserDto } from '@/types/monitoring'

const POLL_INTERVAL_MS = 30_000

/**
 * Список пользователей сети Slush с гео-координатами.
 * Опрашивает GET /Monitoring/online раз в 30 секунд; при ошибке сохраняет последний список.
 */
export function useOnlineUsers() {
  const [users, setUsers] = useState<OnlineUserDto[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const data = await monitoringApi.onlineUsers()
      setUsers(data)
    } catch (err) {
      console.warn('[useOnlineUsers] Не удалось загрузить список онлайн-пользователей', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    const timer = window.setInterval(() => {
      void reload()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [reload])

  return { users, loading, reload }
}
