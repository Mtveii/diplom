import { httpClient } from './httpClient'
import type { NotificationChannel, NotificationChannelSettingDto } from '@/types/notification'

export const notificationsApi = {
  getChannels: () =>
    httpClient.get<NotificationChannelSettingDto[]>('/notifications/channels').then((r) => r.data),

  updateChannel: (channel: NotificationChannel, isEnabled: boolean, configJson: string | null) =>
    httpClient
      .put<NotificationChannelSettingDto>(`/notifications/channels/${channel}`, { isEnabled, configJson })
      .then((r) => r.data),

  sendTest: (channel: NotificationChannel) =>
    httpClient.post(`/notifications/test/${channel}`),
}

export const steamApi = {
  getPlayers: (steamIds: string[]) =>
    httpClient.get('/steam/players', { params: { steamIds: steamIds.join(',') } }).then((r) => r.data),

  getPlayerGames: (steamId: string) =>
    httpClient.get(`/steam/players/${steamId}/games`).then((r) => r.data),

  searchGames: (query: string, limit = 20) =>
    httpClient.get('/steam/search', { params: { query, limit } }).then((r) => r.data),

  getNews: (appId: number) => httpClient.get(`/steam/games/${appId}/news`).then((r) => r.data),
}

export const auditApi = {
  getLogs: (params?: { page?: number; pageSize?: number; entityType?: string }) =>
    httpClient.get('/audit', { params }).then((r) => r.data),
}