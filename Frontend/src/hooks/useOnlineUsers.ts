import { useCallback, useEffect, useState } from 'react'
import { monitoringApi } from '@/services/api/monitoring.api'
import type { OnlineUserDto } from '@/types/monitoring'

const POLL_INTERVAL_MS = 5_000

/**
 * Список пользователей сети Slush с гео-координатами.
 * Опрашивает GET /Monitoring/online каждые 5 секунд (бекенд почти не пушит
 * SignalR-события — проверено живьём, поэтому короткий интервал — основной
 * путь обновлений) + мгновенный рефетч при возврате на вкладку.
 * При ошибке сохраняет последний список.
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
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void reload()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  return { users, loading, reload }
}
