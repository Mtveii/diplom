import { useCallback, useEffect, useState } from 'react'
import { monitoringApi } from '@/services/api/monitoring.api'
import type {
  ActivityPointDto,
  HeatmapPointDto,
  TopPlayerDto,
} from '@/types/monitoring'

export function useMonitoringCharts() {
  const [activity, setActivity] = useState<ActivityPointDto[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapPointDto[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayerDto[]>([])
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [activityData, heatmapData, topData] = await Promise.all([
      monitoringApi.activity(period),
      monitoringApi.heatmap(30),
      monitoringApi.topPlayers(period, 10),
    ])
    setActivity(activityData)
    setHeatmap(heatmapData)
    setTopPlayers(topData)
    setLoading(false)
  }, [period])

  useEffect(() => {
    void reload()
  }, [reload])

  return { activity, heatmap, topPlayers, period, setPeriod, loading, reload }
}