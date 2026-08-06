import { httpClient } from './httpClient'
import type {
  ActivityPointDto,
  DashboardSummaryDto,
  GameMonitorDto,
  HeatmapPointDto,
  OnlineStatusDto,
  TopPlayerDto,
} from '@/types/monitoring'

export const monitoringApi = {
  summary: () => httpClient.get<DashboardSummaryDto>('/monitoring/summary').then((r) => r.data),

  online: () => httpClient.get<OnlineStatusDto[]>('/monitoring/online').then((r) => r.data),

  activity: (period: 'day' | 'week' | 'month') =>
    httpClient.get<ActivityPointDto[]>('/monitoring/activity', { params: { period } }).then((r) => r.data),

  heatmap: (days = 30) =>
    httpClient.get<HeatmapPointDto[]>('/monitoring/heatmap', { params: { days } }).then((r) => r.data),

  topPlayers: (period: string, limit = 10) =>
    httpClient.get<TopPlayerDto[]>('/monitoring/top-players', { params: { period, limit } }).then((r) => r.data),

  gameMonitor: (appId: number) =>
    httpClient.get<GameMonitorDto>(`/monitoring/games/${appId}`).then((r) => r.data),
}