import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Chart, { type ChartForecast } from '@/components/Chart'
import ForecastToggle from '@/components/ForecastToggle'
import HeatmapChart from '@/components/HeatmapChart'
import Spinner from '@/components/Spinner'
import { chartTheme } from '@/styles/chartTheme'
import { useDashboard } from '@/hooks/useDashboard'
import { useLocale } from '@/hooks/useLocale'
import { useMonitoringCharts, type Period } from '@/hooks/useMonitoringCharts'
import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import { buildSeriesForecast } from '@/utils/forecast'
import { formatRelativeDate } from '@/utils/format'
import type { ChartPoint } from '@/components/Chart'

type TimeFilterKey = 'today' | 'week' | 'month' | 'days60' | 'days90' | 'all'

export default function DashboardPage() {
  const { t, locale } = useLocale()
  const timeFilters: { key: TimeFilterKey; label: string; apiPeriod: Period }[] = [
    { key: 'today', label: t.dashboard.filterToday, apiPeriod: 'day' },
    { key: 'week', label: t.dashboard.filterWeek, apiPeriod: 'week' },
    { key: 'month', label: t.dashboard.filterMonth, apiPeriod: 'month' },
    { key: 'days60', label: t.dashboard.filter60, apiPeriod: 'days60' },
    { key: 'days90', label: t.dashboard.filter90, apiPeriod: 'days90' },
    { key: 'all', label: t.dashboard.filterAll, apiPeriod: 'all' },
  ]
  const { summary, loading, reload: reloadSummary } = useDashboard()
  const { activity, registrations, heatmap, gameTrends, setPeriod, loading: chartsLoading, reload: reloadCharts } = useMonitoringCharts()
  const { users: onlineUsers } = useOnlineUsers()

  const onlineTopGames = useMemo(() => gameTrends.slice(0, 5), [gameTrends])

  const [timeFilter, setTimeFilter] = useState<TimeFilterKey>('week')
  const currentFilter = timeFilters.find((filter) => filter.key === timeFilter) ?? timeFilters[1]
  const [forecastOn, setForecastOn] = useState(false)

  const forecasts = useMemo<ChartForecast[]>(() => {
    if (!forecastOn) {
      return []
    }
    const build = (points: ChartPoint[], target: string, label: string, color: string): ChartForecast | null => {
      const result = buildSeriesForecast({
        values: points.map((point) => point.value),
        times: points.map((point) => new Date(point.timestamp).getTime()),
        label,
        color,
        min: 0,
      })
      if (!result || result.points.length === 0) {
        return null
      }
      return {
        target,
        label,
        color,
        from: new Date(result.fromTime).toISOString(),
        points: result.points,
      }
    }
    return [
      build(activity, 'value', t.dashboard.seriesOnline, '#60a5fa'),
      build(registrations, 'value2', t.dashboard.seriesNew, '#f59e0b'),
    ].filter((item): item is ChartForecast => item !== null)
  }, [forecastOn, activity, registrations, t])

  const [now, setNow] = useState(() => Date.now())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setPeriod(currentFilter.apiPeriod)
  }, [currentFilter.apiPeriod, setPeriod])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([reloadCharts(), reloadSummary()])
    } finally {
      setRefreshing(false)
    }
  }

  if (loading || chartsLoading) {
    return <Spinner label={t.dashboard.loading} fullPage />
  }

  const lastActivityAt = activity.length
    ? new Date(Math.max(...activity.map((point) => new Date(point.timestamp).getTime()))).toISOString()
    : null

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-white">{t.dashboard.welcome}</h1>
          <p className="hidden sm:block mt-0.5 text-xs sm:text-sm text-slate-400">{t.dashboard.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
            <span className="live-dot" />
            Live · {lastActivityAt ? formatRelativeDate(lastActivityAt, now, locale) : '—'}
          </div>
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-900 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-800 disabled:opacity-60"
          >
            <svg
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-primary-400' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span className="hidden sm:inline">{t.common.refresh}</span>
          </button>
          <div className="flex gap-1 rounded-lg border border-surface-700 bg-surface-900 p-0.5">
            {timeFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setTimeFilter(filter.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  timeFilter === filter.key
                    ? 'bg-primary-500 text-surface-950 font-semibold shadow-glow'
                    : 'text-slate-400 hover:bg-surface-800'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6">
      
      {/* Top Holding Banner & My Portfolio Mini Cards */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card card-hud p-4 sm:p-6 xl:col-span-1 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.dashboard.totalUsers}</div>
            <div className="mt-2 text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {summary?.totalMembers ?? 0} <span className="text-sm font-normal text-slate-400">{t.dashboard.usersSuffix}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="rounded-full bg-success-500/15 px-2 py-0.5 text-success-400 font-semibold">{t.dashboard.onlineBadge(summary?.onlineNow ?? 0)}</span>
              <span className="text-slate-500">{t.dashboard.activeToday(summary?.playersToday ?? 0)}</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-surface-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>{t.dashboard.networkStability} <strong className="text-success-400">{summary?.networkStabilityPercent != null ? `${summary.networkStabilityPercent}%` : '—'}</strong></span>
            <span>{t.dashboard.alertsLabel} <strong className="text-rose-400">{summary?.activeAlerts ?? 0}</strong></span>
          </div>
        </div>

        <div className="card card-hud p-5 xl:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.dashboard.keyMetrics}</span>
            <span className="text-xs text-primary-400 font-medium cursor-pointer hover:underline">{t.dashboard.seeAll}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/60 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">{t.dashboard.onlineUsers}</span>
              <span className="text-sm font-bold text-white">{onlineUsers.length}</span>
              <span className="text-[10px] text-slate-500">{t.dashboard.onlineNow}</span>
            </div>
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/60 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">{t.dashboard.activeSessions}</span>
              <span className="text-sm font-bold text-white">{summary?.playersToday ?? '—'}</span>
              <span className="text-[10px] text-slate-500">{t.dashboard.slushNetwork}</span>
            </div>
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/60 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">{t.dashboard.stabilityTitle}</span>
              <span className={`text-sm font-bold ${(summary?.networkStabilityPercent ?? 0) >= 95 ? 'text-success-400' : 'text-warning-400'}`}>
                {summary?.networkStabilityPercent != null ? `${summary.networkStabilityPercent}%` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">{t.dashboard.uptimeApi}</span>
            </div>
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/60 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">{t.dashboard.topGame}</span>
              <span className="truncate text-sm font-bold text-white" title={gameTrends[0]?.name}>
                {gameTrends[0]?.name ?? '—'}
              </span>
              <span className="text-[10px] text-primary-300">{gameTrends[0] ? t.dashboard.playersCount(gameTrends[0].count) : t.dashboard.noGameData}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Performance Chart (Portfolio Performance style) */}
      <div className="card card-hud p-4 sm:p-6">
        <div className="card-header-hud mb-4 flex-wrap items-center justify-between">
          <div>
            <h3 className="card-header-hud__title text-sm">{t.dashboard.chartTitle}</h3>
            <div className="card-header-hud__subtitle">{t.dashboard.chartSubtitle}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {timeFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setTimeFilter(filter.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  timeFilter === filter.key
                    ? 'bg-surface-800 text-primary-400 border border-primary-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
            {activity.length >= 2 && (
              <ForecastToggle enabled={forecastOn} onToggle={() => setForecastOn((prev) => !prev)} />
            )}
          </div>
        </div>
        <div className="h-72 w-full">
          <Chart
            data={activity}
            label={t.dashboard.seriesOnline}
            color="#60a5fa"
            secondary={{ data: registrations, label: t.dashboard.seriesNew, color: '#f59e0b' }}
            forecasts={forecasts}
          />
        </div>
      </div>

      {/* Heatmap 100% width */}
      <HeatmapChart data={heatmap} />

      {/* Bottom Grid: Top Games & Online Users */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card card-hud p-5">
          <div className="card-header-hud">
            <h3 className="card-header-hud__title">{t.dashboard.topGames}</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">{t.dashboard.inGameNow}</span>
          </div>
          {onlineTopGames.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.dashboard.nobodyPlaying}
            </div>
          ) : (
            <div style={{ height: Math.max(140, onlineTopGames.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={onlineTopGames} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#172554', opacity: 0.4 }}
                    contentStyle={{
                      background: chartTheme.tooltip.background,
                      border: chartTheme.tooltip.border,
                      borderRadius: chartTheme.tooltip.borderRadius,
                      boxShadow: chartTheme.tooltip.boxShadow,
                      fontSize: chartTheme.tooltip.fontSize,
                    }}
                  />
                  <Bar dataKey="count" name={t.dashboard.playersBar} fill="#60a5fa" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud">
            <h3 className="card-header-hud__title">{t.dashboard.onlinePanel}</h3>
            <span className="card-header-hud__subtitle badge border border-success-500/40 bg-success-500/10 text-success-400">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot bg-success-400" />
              {t.dashboard.onlineCount(onlineUsers.length)}
            </span>
          </div>
          {onlineUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.dashboard.nobodyOnline}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {[...onlineUsers]
                .sort((a, b) => (a.currentGame ? -1 : 0) - (b.currentGame ? -1 : 0))
                .map((member) => (
                  <div
                    key={member.steamId}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-800/60"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        member.currentGame ? 'animate-pulse-dot bg-primary-400' : 'bg-success-400'
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      {member.nickname}
                      <span className="ml-1.5 text-xs text-slate-500">
                        {member.city && member.country
                          ? `${member.city}, ${member.country}`
                          : t.geo.unknown}
                      </span>
                    </span>
                    {member.currentGame ? (
                      <span className="max-w-32 truncate text-xs text-primary-300" title={member.currentGame}>
                        {member.currentGame}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-success-400">{t.dashboard.onlineStatus}</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}