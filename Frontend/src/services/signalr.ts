import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '@/store/authStore'
import type { AlertHistoryDto } from '@/types/alert'
import type { OnlineStatusDto } from '@/types/monitoring'

let connection: signalR.HubConnection | null = null

function getConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/dashboard', {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()
  }
  return connection
}

export async function startSignalR(): Promise<void> {
  const hub = getConnection()
  if (hub.state !== signalR.HubConnectionState.Disconnected) {
    return
  }
  await hub.start()
}

export async function stopSignalR(): Promise<void> {
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
    await connection.stop()
  }
}

export function onOnlineStatusChanged(handler: (status: OnlineStatusDto) => void): void {
  getConnection().on('OnlineStatusChanged', handler)
}

export function onAlertTriggered(handler: (alert: AlertHistoryDto) => void): void {
  getConnection().on('AlertTriggered', handler)
}

export function onReconnecting(handler: () => void): void {
  getConnection().onreconnecting = handler
}

export function onReconnected(handler: () => void): void {
  getConnection().onreconnected = handler
}