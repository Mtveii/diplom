import { httpClient } from './httpClient'
import { getLocaleDictionary } from '@/store/localeStore'
import type { NotificationChannel, NotificationChannelSettingDto, UserNotificationDto } from '@/types/notification'
import type { SteamNewsItemDto } from '@/types/steam'

const CHANNEL_KEYS: Array<{ key: string; channel: NotificationChannel }> = [
  { key: 'Discord', channel: 'Discord' },
  { key: 'Telegram', channel: 'Telegram' },
  { key: 'Email', channel: 'Email' },
  { key: 'Web', channel: 'Web' },
]

/** Имена каналов шлём как есть — бэкенд принимает имена enum. */

interface SlushChannelStateDto {
  isEnabled: boolean
  configurationData: string | null
}

/** Сырая новость публичного Steam News API (ISteamNews/GetNewsForApp). */
interface SteamNewsRawItem {
  gid?: string | number | null
  title?: string | null
  url?: string | null
  author?: string | null
  date?: number | null
  feedlabel?: string | null
}

/** Маппинг сырой новости Steam → наш DTO. Кривые записи отсекаем (null). */
export function mapSteamNewsItem(raw: SteamNewsRawItem, fallbackId: number): SteamNewsItemDto | null {
  if (!raw || typeof raw.title !== 'string' || raw.title.length === 0) {
    return null
  }
  const numericId = typeof raw.gid === 'number' ? raw.gid : Number(raw.gid)
  return {
    id: Number.isSafeInteger(numericId) ? numericId : fallbackId,
    title: raw.title,
    url: typeof raw.url === 'string' ? raw.url : null,
    author: typeof raw.author === 'string' ? raw.author : null,
    date: typeof raw.date === 'number' ? new Date(raw.date * 1000).toISOString() : null,
    feedLabel: typeof raw.feedlabel === 'string' ? raw.feedlabel : null,
  }
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
      .put(`/Notifications/channels/${channel}`, { isEnabled, configurationData: configJson })
      .then((r) => r.data),
}

/** Сырая форма личного уведомления Slush: точные поля недокументированы, всё опционально. */
interface SlushUserNotificationDto {
  id?: string | number | null
  text?: string | null
  message?: string | null
  title?: string | null
  createdAt?: string | null
  createdDate?: string | null
  isRead?: boolean | null
}

interface SlushPagedResultDto<T> {
  items: T[] | null
  totalCount: number
}

/** Маппинг сырого уведомления → наш DTO. Кривые записи отсекаем (null). */
export function mapUserNotification(raw: SlushUserNotificationDto | null | undefined): UserNotificationDto | null {
  if (!raw) return null
  const id = typeof raw.id === 'number' && Number.isSafeInteger(raw.id) ? String(raw.id) : typeof raw.id === 'string' ? raw.id : ''
  if (id.length === 0) return null
  const text =
    [raw.text, raw.message, raw.title].find((part) => typeof part === 'string' && part.length > 0) ?? getLocaleDictionary().common.noData
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : typeof raw.createdDate === 'string' ? raw.createdDate : null
  return { id, text, createdAt, isRead: raw.isRead === true }
}

export const userNotificationsApi = {
  /** Личные уведомления: GET /api/UserNotifications. */
  getNotifications: async (pageSize = 20): Promise<{ items: UserNotificationDto[]; totalCount: number }> => {
    try {
      const raw = await httpClient
        .get<SlushPagedResultDto<SlushUserNotificationDto>>('/UserNotifications', { params: { page: 1, pageSize } })
        .then((r) => r.data)
      return {
        items: (raw.items ?? []).map(mapUserNotification).filter((item): item is UserNotificationDto => item !== null),
        totalCount: typeof raw.totalCount === 'number' ? raw.totalCount : 0,
      }
    } catch (err) {
      console.warn('[notificationsApi] Не удалось загрузить уведомления — показываю пустые данные', err)
      return { items: [], totalCount: 0 }
    }
  },

  /** Счётчик непрочитанных: GET /api/UserNotifications/unread-count. */
  getUnreadCount: async (): Promise<number> => {
    try {
      const { count } = await httpClient.get<{ count: number }>('/UserNotifications/unread-count').then((r) => r.data)
      return typeof count === 'number' ? count : 0
    } catch (err) {
      console.warn('[notificationsApi] Не удалось загрузить счётчик непрочитанных', err)
      return 0
    }
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

  getNews: async (appId: number): Promise<SteamNewsItemDto[]> => {
    // Slush API новостей не отдаёт — идём напрямую в публичный Steam News API
    // через same-origin прокси (/steam-api → api.steampowered.com), иначе CORS.
    // fetch, а не httpClient: у того baseURL '/api', а нам нужен корень.
    try {
      const response = await fetch(
        `/steam-api/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=20&maxlength=0&format=json`,
      )
      if (!response.ok) {
        throw new Error(`Steam News: ${response.status}`)
      }
      const data = (await response.json()) as { appnews?: { newsitems?: SteamNewsRawItem[] } }
      const items = data?.appnews?.newsitems ?? []
      return items
        .map((raw, index) => mapSteamNewsItem(raw, index))
        .filter((item): item is SteamNewsItemDto => item !== null)
    } catch (err) {
      console.warn('[steamApi] Не удалось загрузить новости Steam', err)
      return []
    }
  },
}


