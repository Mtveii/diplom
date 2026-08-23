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
  onlineUsers: () =>
    httpClient.get<OnlineUserDto[]>('/Monitoring/online').then((r) => r.data),

  activity: (period: 'day' | 'week' | 'month') =>
    httpClient
      .get<SlushActivityPointDto[]>('/Monitoring/activity-history', { params: { period } })
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

  gameMonitor: async (_appId: number): Promise<GameMonitorDto | null> => {
    console.info('[monitoringApi] gameMonitor: эндпоинт отсутствует в Slush API — возвращаю null')
    return null
  },
}
