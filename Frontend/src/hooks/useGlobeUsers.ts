import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'

export interface GeoPoint {
  lat: number
  lng: number
  city: string
  country: string
}

export function useGlobeUsers(hubUrl: string) {
  const [users, setUsers] = useState<GeoPoint[]>([])
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build()

    conn.on('UsersUpdated', (points: GeoPoint[]) => setUsers(points))

    conn.start().catch(console.error)
    connectionRef.current = conn

    return () => {
      void conn.stop()
    }
  }, [hubUrl])

  return users
}
