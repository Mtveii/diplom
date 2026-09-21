import { useCallback, useEffect, useState } from 'react'
import { monitoringApi, type MonitoringPeriod } from '@/services/api/monitoring.api'
import { usersApi } from '@/services/api/users.api'
import type { ChartPoint } from '@/components/Chart'
import type { AdminUserDto } from '@/types/auth'
import type {
  ActivityPointDto,
  HeatmapPointDto,
  TopGamesPointDto,
  TopPlayerDto,
} from '@/types/monitoring'

export type Period = MonitoringPeriod

const BUCKET_COUNT: Record<Exclude<Period, 'all'>, number> = { day: 24, week: 7, month: 30, days60: 60, days90: 90 }
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** Захист від гігантської сітки, якщо в даних затесався старий timestamp. */
const MAX_ALL_DAYS = 730

function bucketSize(period: Period): number {
  return period === 'day' ? HOUR_MS : DAY_MS
}

/** «Весь час» — денні бакети від найстарішої точки (activity + реєстрації) до зараз. */
function bucketCount(period: Period, points: ActivityPointDto[], users: AdminUserDto[]): number {
  if (period !== 'all') {
    return BUCKET_COUNT[period]
  }
  const times = [
    ...points.map((point) => new Date(point.timestamp).getTime()),
    ...users.map((user) => new Date(user.createdAt).getTime()),
  ].filter((time) => !Number.isNaN(time))
  if (times.length === 0) {
    return BUCKET_COUNT.month
  }
  const spanDays = Math.ceil((Date.now() - Math.min(...times)) / DAY_MS)
  return Math.min(Math.max(spanDays, 1), MAX_ALL_DAYS)
}

/** Ровная сетка из N бакетов, последний заканчивается «сейчас». */
function buildGrid(period: Period, count: number): number[] {
  const size = bucketSize(period)
  const now = Date.now()
  const lastStart = Math.floor(now / size) * size
  return Array.from({ length: count }, (_, i) => lastStart - (count - 1 - i) * size)
}

function countInBucket(isoDates: string[], start: number, end: number): number {
  return isoDates.filter((iso) => {
    const time = new Date(iso).getTime()
    if (Number.isNaN(time)) return false
    return time >= start && time < end
  }).length
}

/** Пик онлайна внутри каждого бакета (по точкам Slush API). */
function buildOnlineSeries(points: ActivityPointDto[], period: Period, count: number): ChartPoint[] {
  const size = bucketSize(period)
  return buildGrid(period, count).map((start) => {
    const samples = points
      .map((point) => ({ time: new Date(point.timestamp).getTime(), online: point.onlineCount }))
      .filter((sample) => !Number.isNaN(sample.time) && sample.time >= start && sample.time < start + size)
      .map((sample) => sample.online)
    return { timestamp: new Date(start).toISOString(), value: samples.length ? Math.max(...samples) : 0 }
  })
}

/** Число созданных аккаунтов в каждом бакете (по createdAt пользователей). */
function buildRegistrationSeries(users: AdminUserDto[], period: Period, count: number): ChartPoint[] {
  const size = bucketSize(period)
  const createdDates = users.map((user) => user.createdAt)
  return buildGrid(period, count).map((start) => ({
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

      const count = bucketCount(period, activityData, users)
      setActivity(buildOnlineSeries(activityData, period, count))
      setRegistrations(buildRegistrationSeries(users, period, count))
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
