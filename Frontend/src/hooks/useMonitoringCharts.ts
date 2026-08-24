import { useCallback, useEffect, useState } from 'react'
import { monitoringApi } from '@/services/api/monitoring.api'
import { usersApi } from '@/services/api/users.api'
import type { ChartPoint } from '@/components/Chart'
import type { AdminUserDto } from '@/types/auth'
import type {
  ActivityPointDto,
  HeatmapPointDto,
  TopGamesPointDto,
  TopPlayerDto,
} from '@/types/monitoring'

type Period = 'day' | 'week' | 'month'

const BUCKET_COUNT: Record<Period, number> = { day: 24, week: 7, month: 30 }
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function bucketSize(period: Period): number {
  return period === 'day' ? HOUR_MS : DAY_MS
}

/** Ровная сетка из N бакетов, последний заканчивается «сейчас». */
function buildGrid(period: Period): number[] {
  const size = bucketSize(period)
  const now = Date.now()
  const lastStart = Math.floor(now / size) * size
  return Array.from({ length: BUCKET_COUNT[period] }, (_, i) => lastStart - (BUCKET_COUNT[period] - 1 - i) * size)
}

function countInBucket(isoDates: string[], start: number, end: number): number {
  return isoDates.filter((iso) => {
    const time = new Date(iso).getTime()
    return time >= start && time < end
  }).length
}

/** Пик онлайна внутри каждого бакета (по точкам Slush API). */
function buildOnlineSeries(points: ActivityPointDto[], period: Period): ChartPoint[] {
  const size = bucketSize(period)
  return buildGrid(period).map((start) => {
    const samples = points
      .map((point) => ({ time: new Date(point.timestamp).getTime(), online: point.onlineCount }))
      .filter((sample) => sample.time >= start && sample.time < start + size)
      .map((sample) => sample.online)
    return { timestamp: new Date(start).toISOString(), value: samples.length ? Math.max(...samples) : 0 }
  })
}

/** Число созданных аккаунтов в каждом бакете (по createdAt пользователей). */
function buildRegistrationSeries(users: AdminUserDto[], period: Period): ChartPoint[] {
  const size = bucketSize(period)
  const createdDates = users.map((user) => user.createdAt)
  return buildGrid(period).map((start) => ({
    timestamp: new Date(start).toISOString(),
    value: countInBucket(createdDates, start, start + size),
  }))
}

/** Тепловая карта = онлайн-интенсивность бэкенда + регистрации по часам/дням. */
function mergeHeatmapWithRegistrations(heatmap: HeatmapPointDto[], users: AdminUserDto[]): HeatmapPointDto[] {
  const cells = new Map(heatmap.map((point) => [`${point.dayOfWeek}:${point.hour}`, { ...point }]))
  for (const user of users) {
    const date = new Date(user.createdAt)
    const key = `${date.getUTCDay()}:${date.getUTCHours()}`
    const cell = cells.get(key)
    if (cell) {
      cell.activeCount += 1
    } else {
      cells.set(key, { dayOfWeek: date.getUTCDay(), hour: date.getUTCHours(), activeCount: 1 })
    }
  }
  return [...cells.values()]
}

export function useMonitoringCharts() {
  const [activity, setActivity] = useState<ChartPoint[]>([])
  const [registrations, setRegistrations] = useState<ChartPoint[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapPointDto[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayerDto[]>([])
  const [gameTrends, setGameTrends] = useState<TopGamesPointDto[]>([])
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const [activityData, heatmapData, topData, trendsData] = await Promise.all([
        monitoringApi.activity(period),
        monitoringApi.heatmap(30),
        monitoringApi.topPlayers(period, 10),
        monitoringApi.gameTrends(),
      ])

      // Регистрации — вторичная активность; их недоступность не ломает основные графики.
      let users: AdminUserDto[] = []
      try {
        users = await usersApi.getUsers()
      } catch (err) {
        console.warn('[useMonitoringCharts] Не удалось загрузить пользователей для регистраций', err)
      }

      setActivity(buildOnlineSeries(activityData, period))
      setRegistrations(buildRegistrationSeries(users, period))
      setHeatmap(mergeHeatmapWithRegistrations(heatmapData, users))
      setTopPlayers(topData)
      setGameTrends(trendsData)
    } catch (err) {
      console.warn('[useMonitoringCharts] Не удалось загрузить графики — показываю пустые данные', err)
      setActivity([])
      setRegistrations([])
      setHeatmap([])
      setTopPlayers([])
      setGameTrends([])
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void reload()
  }, [reload])

  return { activity, registrations, heatmap, topPlayers, gameTrends, period, setPeriod, loading, reload }
}
