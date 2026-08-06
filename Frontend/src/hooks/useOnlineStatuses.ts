import { useEffect, useState } from 'react'
import { onOnlineStatusChanged, startSignalR, stopSignalR } from '@/services/signalr'
import { useAuthStore } from '@/store/authStore'
import type { OnlineStatusDto } from '@/types/monitoring'

/**
 * Live-статусы участников через SignalR: подключается при наличии токена,
 * локальное состояние обновляется push'ами с сервера.
 */
export function useOnlineStatuses() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const [online, setOnline] = useState<Record<string, OnlineStatusDto>>({})
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let mounted = true
    const connect = async () => {
      try {
        await startSignalR()
        if (mounted) {
          setConnected(true)
        }
      } catch {
        setConnected(false)
      }
    }

    const handler = (status: OnlineStatusDto) => {
      setOnline((prev) => ({ ...prev, [status.steamId64]: status }))
    }

    onOnlineStatusChanged(handler)
    void connect()

    return () => {
      mounted = false
      void stopSignalR()
    }
  }, [accessToken])

  return { online, connected }
}