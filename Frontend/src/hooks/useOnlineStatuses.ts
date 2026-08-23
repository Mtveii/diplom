import { useEffect, useState } from 'react'
import { onOnlineStatusChanged, startSignalR, stopSignalR } from '@/services/signalr'
import type { OnlineStatusDto } from '@/types/monitoring'

/**
 * Live-статусы участников через SignalR: подключается при монтировании,
 * локальное состояние обновляется push'ами с сервера.
 */
export function useOnlineStatuses() {
  const [online, setOnline] = useState<Record<string, OnlineStatusDto>>({})
  const [connected, setConnected] = useState(false)

  useEffect(() => {
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
  }, [])

  return { online, connected }
}