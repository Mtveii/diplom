import { useCallback, useEffect, useState } from 'react'
import { alertsApi } from '@/services/api/alerts.api'
import { onAlertTriggered } from '@/services/signalr'
import type { AlertHistoryDto } from '@/types/alert'

export function useAlerts() {
  const [history, setHistory] = useState<AlertHistoryDto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const [items, count] = await Promise.all([
        alertsApi.getHistory(100),
        alertsApi.unreadCount(),
      ])
      setHistory(items)
      setUnreadCount(count)
    } catch (err) {
      console.warn('[useAlerts] Не удалось загрузить алерты — показываю пустой список', err)
      setHistory([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const handler = (alert: AlertHistoryDto) => {
      setHistory((prev) => [alert, ...prev].slice(0, 100))
      setUnreadCount((prev) => prev + 1)
    }
    onAlertTriggered(handler)
    return () => onAlertTriggered(() => undefined)
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await alertsApi.markAsRead(id)
      setHistory((prev) => prev.map((x) => (x.id === id ? { ...x, isRead: true } : x)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.warn('[useAlerts] Не удалось отметить алерт прочитанным', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await alertsApi.markAllAsRead()
      setHistory((prev) => prev.map((x) => ({ ...x, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.warn('[useAlerts] Не удалось отметить все алерты прочитанными', err)
    }
  }, [])

  return { history, unreadCount, loading, reload, markAsRead, markAllAsRead }
}