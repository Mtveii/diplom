import { httpClient } from './httpClient'
import type {
  ActivityPointDto,
  DashboardSummaryDto,
  GameMonitorDto,
  HeatmapPointDto,
  OnlineUserDto,
  TopGamesPointDto,
  TopPlayerDto,
} from '@/types/monitoring'

/** Сырые формы ответов Slush API (могут отличаться от наших DTO). */
interface SlushSummaryDto {
  totalMembers: number
  onlineMembers: number
  activeSessionsCount: number
  networkStabilityPercent: number
  activeAlertsCount: number
}

interface SlushActivityPointDto {
  timestamp: string
  activeCount: number
}

interface SlushHeatmapPointDto {
  dayOfWeek: number
  hour: number
  intensity: number
}

interface SlushGameTrendPointDto {
  gameName: string
  playerCount: number
}

/** Період графіків дашборда. Бекенд знає лише day/week/month — решта мапиться і бакетиться на клієнті. */
export type MonitoringPeriod = 'day' | 'week' | 'month' | 'days60' | 'days90' | 'all'

function toBackendPeriod(period: MonitoringPeriod): 'day' | 'week' | 'month' {
  if (period === 'day' || period === 'week') return period
  return 'month'
}

export const monitoringApi = {
  summary: async (): Promise<DashboardSummaryDto> => {
    const raw = await httpClient.get<SlushSummaryDto>('/Monitoring/summary').then((r) => r.data)
    return {
      totalMembers: raw.totalMembers,
      onlineNow: raw.onlineMembers,
      playersToday: raw.activeSessionsCount,
      activeThisWeek: 0,
      pendingApplications: 0,
      activeAlerts: raw.activeAlertsCount,
      networkStabilityPercent: raw.networkStabilityPercent,
    }
  },

  /** Живые пользователи сети с гео-координатами (для глобуса и блока «кто онлайн»). */
  onlineUsers: async (): Promise<OnlineUserDto[]> => {
    const fetchUsers = () => httpClient.get<OnlineUserDto[]>('/Monitoring/online').then((r) => r.data)
    let data = await fetchUsers()
    if (!Array.isArray(data) || data.length === 0) {
      // Бэкенд может быть пустым (нет реальных онлайн-пользователей) —
      // подтягиваем демо-данные один раз за сессию, чтобы глобус/онлайн не были пустыми.
      try {
        if (!window.localStorage.getItem('slush-seeded-globe')) {
          await httpClient.post('/Monitoring/seed-mock-globe')
          window.localStorage.setItem('slush-seeded-globe', '1')
          data = await fetchUsers()
        }
      } catch (err) {
        console.warn('[monitoringApi] Не удалось засеять демо-пользователей', err)
      }
    }
    return Array.isArray(data) ? data : []
  },

  activity: (period: MonitoringPeriod) =>
    httpClient
      .get<SlushActivityPointDto[]>('/Monitoring/activity-history', { params: { period: toBackendPeriod(period) } })
      .then((r): ActivityPointDto[] => r.data.map((point) => ({ timestamp: point.timestamp, onlineCount: point.activeCount }))),

  heatmap: (_days = 30) =>
    httpClient
      .get<SlushHeatmapPointDto[]>('/Monitoring/heatmap')
      .then((r): HeatmapPointDto[] => r.data.map((point) => ({ ...point, activeCount: point.intensity }))),

  /** Топ игр по числу игроков (для графика «Топ-5 игр» на дашборде). */
  gameTrends: () =>
    httpClient
      .get<SlushGameTrendPointDto[]>('/Monitoring/game-trends')
      .then((r): TopGamesPointDto[] => r.data.map((point) => ({ name: point.gameName, count: point.playerCount }))),

  topPlayers: async (_period: string, _limit = 10): Promise<TopPlayerDto[]> => {
    console.info('[monitoringApi] topPlayers: эндпоинт отсутствует в Slush API — возвращаю пустой список')
    return []
  },

  gameMonitor: async (appId: number): Promise<GameMonitorDto | null> => {
    // Бэкенд (Slush) эндпоинта нет — тянем напрямую из публичного Steam Store API.
    try {
      const [detailsRes, spyRes] = await Promise.allSettled([
        fetch(`/steam-store/api/appdetails?appids=${appId}&l=english`),
        fetch(`/steamspy/api.php?request=appdetails&appid=${appId}`),
      ])

      let name = ''
      let currentPrice: number | null = null
      let currentDiscountPercent: number | null = null
      if (detailsRes.status === 'fulfilled' && detailsRes.value.ok) {
        const json = (await detailsRes.value.json()) as Record<string, { success?: boolean; data?: { name?: string; price_overview?: { final?: number; discount_percent?: number } } }>
        const entry = json?.[String(appId)]
        if (entry?.success && entry.data) {
          name = entry.data.name ?? ''
          if (entry.data.price_overview) {
            currentPrice = (entry.data.price_overview.final ?? 0) / 100
            currentDiscountPercent = entry.data.price_overview.discount_percent ?? 0
          }
        }
      }

      let positiveReviewPercent: number | null = null
      let totalReviews: number | null = null
      if (spyRes.status === 'fulfilled' && spyRes.value.ok) {
        const json = (await spyRes.value.json()) as { positive?: number; negative?: number }
        const pos = typeof json?.positive === 'number' ? json.positive : 0
        const neg = typeof json?.negative === 'number' ? json.negative : 0
        const total = pos + neg
        if (total > 0) {
          totalReviews = total
          positiveReviewPercent = (pos / total) * 100
        }
      }

      if (!name && currentPrice == null && positiveReviewPercent == null) {
        return null
      }

      return {
        appId,
        name: name || `App ${appId}`,
        currentPrice,
        currentDiscountPercent,
        positiveReviewPercent,
        totalReviews,
        trend: [],
        achievements: [],
        clanOwners: 0,
      }
    } catch (err) {
      console.warn('[monitoringApi] gameMonitor fallback failed', err)
      return null
    }
  },
}
