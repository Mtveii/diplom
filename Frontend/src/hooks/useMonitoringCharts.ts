import { useCallback, useEffect, useState } from 'react'
import { monitoringApi } from '@/services/api/monitoring.api'
import type {
  ActivityPointDto,
  HeatmapPointDto,
  TopGamesPointDto,
  TopPlayerDto,
} from '@/types/monitoring'

export function useMonitoringCharts() {
  const [activity, setActivity] = useState<ActivityPointDto[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapPointDto[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayerDto[]>([])
  const [gameTrends, setGameTrends] = useState<TopGamesPointDto[]>([])
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const [activityData, heatmapData, topData, trendsData] = await Promise.all([
        monitoringApi.activity(period),
        monitoringApi.heatmap(30),
        monitoringApi.topPlayers(period, 10),
        monitoringApi.gameTrends(),
      ])
      setActivity(activityData)
      setHeatmap(heatmapData)
      setTopPlayers(topData)
      setGameTrends(trendsData)
    } catch (err) {
      console.warn('[useMonitoringCharts] Не удалось загрузить графики — показываю пустые данные', err)
      setActivity([])
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

  return { activity, heatmap, topPlayers, gameTrends, period, setPeriod, loading, reload }
}
