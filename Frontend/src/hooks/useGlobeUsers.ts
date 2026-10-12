import { useCallback, useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { API_BASE_URL } from '@/services/api/httpClient'
import { monitoringApi } from '@/services/api/monitoring.api'
import { useAuthStore } from '@/store/authStore'
import { ODESSA_COORDS, toGlobePoints, type GeoPoint } from '@/utils/geo'

export type { GeoPoint }

const REST_REFRESH_INTERVAL_MS = 5_000

/**
 * Точки пользователей на глобусе:
 * — стартовый список из GET /Monitoring/online;
 * — live-обновления через SignalR /hubs/globe (событие UsersUpdated, если бекенд его шлёт);
 * — опрос REST каждые 5 секунд (бекенд по факту почти не пушит события —
 *   проверено живьём: за 25 секунд подписки ни одного UsersUpdated,
 *   поэтому короткий интервал — основной путь обновлений);
 * — мгновенный рефетч при возврате на вкладку.
 */
export function useGlobeUsers() {
  const [users, setUsers] = useState<GeoPoint[]>([])
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const mountedRef = useRef(true)

  const loadFromRest = useCallback(async () => {
    try {
      const data = await monitoringApi.onlineUsers()
      if (!mountedRef.current) {
        return
      }
      // Юзеры без координат встают на Одессу по умолчанию — иначе глобус пустой.
      setUsers(toGlobePoints(data, ODESSA_COORDS))
    } catch (err) {
      console.warn('[useGlobeUsers] Не удалось загрузить точки с REST', err)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    void loadFromRest()
    const restTimer = window.setInterval(() => {
      void loadFromRest()
    }, REST_REFRESH_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadFromRest()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    const hubUrl = `${API_BASE_URL}/hubs/globe`
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    const usersHandler = (points: GeoPoint[]) => {
      if (mountedRef.current && Array.isArray(points)) {
        // Пуш с бека тоже чистим от маркеров (0,0/"Unknown"), как REST-данные.
        setUsers(toGlobePoints(points, ODESSA_COORDS))
      }
    }
    conn.on('UsersUpdated', usersHandler)

    conn.start().catch((err: unknown) => {
      console.warn('[useGlobeUsers] SignalR /hubs/globe не подключился — работаю по REST-опросу', err)
    })
    connectionRef.current = conn

    return () => {
      mountedRef.current = false
      window.clearInterval(restTimer)
      document.removeEventListener('visibilitychange', onVisible)
      conn.off('UsersUpdated', usersHandler)
      void conn.stop()
    }
  }, [loadFromRest])

  return users
}
