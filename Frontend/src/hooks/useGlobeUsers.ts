import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { API_BASE_URL } from '@/services/api/httpClient'
import { monitoringApi } from '@/services/api/monitoring.api'
import { useAuthStore } from '@/store/authStore'

export interface GeoPoint {
  lat: number
  lng: number
  city: string
  country: string
}

const REST_REFRESH_INTERVAL_MS = 30_000

/**
 * Точки пользователей на глобусе:
 * — стартовый список из GET /Monitoring/online;
 * — live-обновления через SignalR /hubs/globe (событие UsersUpdated, если бекенд его шлёт);
 * — резервный опрос REST раз в 30 секунд.
 */
export function useGlobeUsers() {
  const [users, setUsers] = useState<GeoPoint[]>([])
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    let mounted = true

    const loadFromRest = async () => {
      try {
        const data = await monitoringApi.onlineUsers()
        if (!mounted) {
          return
        }
        setUsers(
          data.map((user) => ({
            lat: user.lat,
            lng: user.lng,
            city: user.city,
            country: user.country,
          })),
        )
      } catch (err) {
        console.warn('[useGlobeUsers] Не удалось загрузить точки с REST', err)
      }
    }

    void loadFromRest()
    const restTimer = window.setInterval(() => {
      void loadFromRest()
    }, REST_REFRESH_INTERVAL_MS)

    const hubUrl = `${API_BASE_URL}/hubs/globe`
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    const usersHandler = (points: GeoPoint[]) => {
      if (mounted && Array.isArray(points)) {
        setUsers(points)
      }
    }
    conn.on('UsersUpdated', usersHandler)

    conn.start().catch((err: unknown) => {
      console.warn('[useGlobeUsers] SignalR /hubs/globe не подключился — работаю по REST-опросу', err)
    })
    connectionRef.current = conn

    return () => {
      mounted = false
      window.clearInterval(restTimer)
      conn.off('UsersUpdated', usersHandler)
      void conn.stop()
    }
  }, [])

  return users
}
