import { httpClient } from './httpClient'
import type { NotificationChannel, NotificationChannelSettingDto } from '@/types/notification'

const CHANNEL_KEYS: Array<{ key: string; channel: NotificationChannel }> = [
  { key: 'Discord', channel: 'Discord' },
  { key: 'Telegram', channel: 'Telegram' },
  { key: 'Email', channel: 'Email' },
  { key: '3', channel: 'InApp' },
]

/** Бекенд не знает имя "InApp" — четвёртый канал живёт под номером 3. */
function channelPathKey(channel: NotificationChannel): string {
  return channel === 'InApp' ? '3' : channel
}

interface SlushChannelStateDto {
  isEnabled: boolean
  configurationData: string | null
}

export const notificationsApi = {
  /** Реальные состояния каналов: GET /Notifications/channels/{channel} по каждому. */
  getChannels: async (): Promise<NotificationChannelSettingDto[]> =>
    Promise.all(
      CHANNEL_KEYS.map(async ({ key, channel }): Promise<NotificationChannelSettingDto> => {
        try {
          const state = await httpClient.get<SlushChannelStateDto>(`/Notifications/channels/${key}`).then((r) => r.data)
          return { channel, isEnabled: state.isEnabled, configJson: state.configurationData }
        } catch (err) {
          console.warn(`[notificationsApi] Не удалось получить состояние канала ${key}`, err)
          return { channel, isEnabled: false, configJson: null }
        }
      }),
    ),

  updateChannel: (channel: NotificationChannel, isEnabled: boolean, configJson: string | null) =>
    httpClient
      .put(`/Notifications/channels/${channelPathKey(channel)}`, { isEnabled, configurationData: configJson })
      .then((r) => r.data),

  sendTest: async (_channel: NotificationChannel): Promise<void> => {
    console.info('[notificationsApi] sendTest: эндпоинт отсутствует в Slush API')
  },
}

/** Steam-эндпоинты в Slush API отсутствуют — отдаём пустые данные. */
export const steamApi = {
  getPlayers: async (_steamIds: string[]) => {
    console.info('[steamApi] Эндпоинт отсутствует в Slush API')
    return []
  },

  getPlayerGames: async (_steamId: string) => {
    console.info('[steamApi] Эндпоинт отсутствует в Slush API')
    return []
  },

  searchGames: async (_query: string, _limit = 20) => {
    console.info('[steamApi] Эндпоинт отсутствует в Slush API')
    return []
  },

  getNews: async (_appId: number) => {
    console.info('[steamApi] Новости: эндпоинт отсутствует в Slush API — возвращаю пустой список')
    return []
  },
}

export const auditApi = {
  getLogs: async (_params?: { page?: number; pageSize?: number; entityType?: string }) => {
    console.info('[auditApi] Эндпоинт отсутствует в Slush API')
    return { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }
  },
}
