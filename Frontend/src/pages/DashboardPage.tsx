import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Chart from '@/components/Chart'
import DonutChart from '@/components/DonutChart'
import HeatmapChart from '@/components/HeatmapChart'
import Spinner from '@/components/Spinner'
import { chartTheme } from '@/styles/chartTheme'
import { useClanStats } from '@/hooks/useClanStats'
import { useDashboard } from '@/hooks/useDashboard'
import { useMonitoringCharts } from '@/hooks/useMonitoringCharts'
import { useOnlineStatuses } from '@/hooks/useOnlineStatuses'
import { analyticsApi } from '@/services/api/analytics.api'
import { formatHours, formatRelativeDate } from '@/utils/format'
import type { PeriodComparisonDto } from '@/types/analytics'

type TimeFilterKey = 'today' | 'week' | 'month'

const timeFilters: { key: TimeFilterKey; label: string; apiPeriod: 'day' | 'week' | 'month'; compareDays: number }[] = [
  { key: 'today', label: 'Сегодня', apiPeriod: 'day', compareDays: 1 },
  { key: 'week', label: '7 дней', apiPeriod: 'week', compareDays: 7 },
  { key: 'month', label: '30 дней', apiPeriod: 'month', compareDays: 30 },
]

export default function DashboardPage() {
  const { summary, loading, reload: reloadSummary } = useDashboard()
  const { activity, heatmap, setPeriod, loading: chartsLoading, reload: reloadCharts } = useMonitoringCharts()
  const { counts, ranks, statuses, topGames } = useClanStats()
  const { online, connected } = useOnlineStatuses()

  const [timeFilter, setTimeFilter] = useState<TimeFilterKey>('week')
  const currentFilter = timeFilters.find((filter) => filter.key === timeFilter) ?? timeFilters[1]

  const [comparison, setComparison] = useState<PeriodComparisonDto | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setPeriod(currentFilter.apiPeriod)
  }, [currentFilter.apiPeriod, setPeriod])

  useEffect(() => {
    let cancelled = false
    analyticsApi
      .compare(currentFilter.compareDays)
      .then((data) => {
        if (!cancelled) {
          setComparison(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setComparison(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [currentFilter.compareDays])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([reloadCharts(), reloadSummary()])
      const data = await analyticsApi.compare(currentFilter.compareDays).catch(() => null)
      setComparison(data)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading || chartsLoading) {
    return <Spinner label="Загрузка данных клана..." fullPage />
  }

  const lastActivityAt = activity.length
    ? new Date(Math.max(...activity.map((point) => new Date(point.timestamp).getTime()))).toISOString()
    : null

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-white">Welcome, Администратор</h1>
          <p className="hidden sm:block mt-0.5 text-xs sm:text-sm text-slate-400">Обзор показателей и активности Steam-клана в реальном времени</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
            <span className="live-dot" />
            Live · {lastActivityAt ? formatRelativeDate(lastActivityAt, now) : '—'}
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
            <span className="hidden sm:inline">Обновить</span>
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
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Holding / Актив клана</div>
            <div className="mt-2 text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {summary?.totalMembers ?? 0} <span className="text-sm font-normal text-slate-400">участников</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="rounded-full bg-success-500/15 px-2 py-0.5 text-success-400 font-semibold">+{summary?.onlineNow ?? 0} онлайн</span>
              <span className="text-slate-500">· актив сегодня: {summary?.playersToday ?? 0}</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-surface-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Заявки: <strong className="text-white">{summary?.pendingApplications ?? 0}</strong></span>
            <span>Алерты: <strong className="text-rose-400">{summary?.activeAlerts ?? 0}</strong></span>
          </div>
        </div>

        <div className="card card-hud p-5 xl:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">My Portfolio / Ключевые метрики</span>
            <span className="text-xs text-primary-400 font-medium cursor-pointer hover:underline">See all ↗</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/60 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">АКТИВНЫХ ИГРОКОВ</span>
              <span className="text-sm font-bold text-white">{comparison?.currentActivePlayers ?? '—'}</span>
              <span className={`text-[10px] ${comparison && comparison.activePlayersChangePercent >= 0 ? 'text-success-400' : 'text-rose-400'}`}>
                {comparison ? `${comparison.activePlayersChangePercent >= 0 ? '+' : ''}${comparison.activePlayersChangePercent}%` : '—'}
              </span>
            </div>
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/60 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">СЫГРАНО ВРЕМЕНИ</span>
              <span className="text-sm font-bold text-white">{comparison ? formatHours(comparison.currentPlaytimeMinutes) : '—'}</span>
              <span className={`text-[10px] ${comparison && comparison.playtimeChangePercent >= 0 ? 'text-success-400' : 'text-rose-400'}`}>
                {comparison ? `${comparison.playtimeChangePercent >= 0 ? '+' : ''}${comparison.playtimeChangePercent}%` : '—'}
              </span>
            </div>
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/60 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">СРЕДНИЙ ОНЛАЙН</span>
              <span className="text-sm font-bold text-white">{comparison ? Math.round(comparison.currentAverageDailyOnline) : '—'}</span>
              <span className={`text-[10px] ${comparison && comparison.averageOnlineChangePercent >= 0 ? 'text-success-400' : 'text-rose-400'}`}>
                {comparison ? `${comparison.averageOnlineChangePercent >= 0 ? '+' : ''}${comparison.averageOnlineChangePercent}%` : '—'}
              </span>
            </div>
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/60 p-3 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-medium">SIGNALR / HUB</span>
              <span className="text-sm font-bold text-success-400">Connected</span>
              <span className="text-[10px] text-success-400">Live Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Performance Chart (Portfolio Performance style) */}
      <div className="card card-hud p-4 sm:p-6">
        <div className="card-header-hud mb-4 flex-wrap items-center justify-between">
          <div>
            <h3 className="card-header-hud__title text-sm">Portfolio Performance / Динамика онлайна</h3>
            <div className="card-header-hud__subtitle">Сравнение активности участников за выбранный период</div>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
        <div className="h-72 w-full">
          <Chart data={activity.map((p) => ({ timestamp: p.timestamp, value: p.onlineCount }))} label="Онлайн" color="#60a5fa" />
        </div>
      </div>

      {/* Heatmap 100% width */}
      <HeatmapChart data={heatmap} />

      {/* Bottom Grid: Portfolio Overview (Left) & Watchlist / Stats (Right) */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card card-hud p-5">
          <div className="card-header-hud">
            <h3 className="card-header-hud__title">Состав клана по рангам</h3>
          </div>
          {counts.total === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              Участники ещё не добавлены
            </div>
          ) : (
            <DonutChart data={ranks} centerValue={counts.total} centerLabel="участников" />
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud">
            <h3 className="card-header-hud__title">Статусы участников</h3>
          </div>
          {counts.total === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              Участники ещё не добавлены
            </div>
          ) : (
            <DonutChart data={statuses} centerValue={counts.online} centerLabel="онлайн из всех" />
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud">
            <h3 className="card-header-hud__title">Топ-5 игр клана</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">сейчас в игре</span>
          </div>
          {topGames.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              Сейчас никто не играет
            </div>
          ) : (
            <div style={{ height: Math.max(140, topGames.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGames} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
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
                  <Bar dataKey="count" name="Игроков" fill="#60a5fa" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud">
            <h3 className="card-header-hud__title">Клан онлайн сейчас</h3>
            <span
              className={`card-header-hud__subtitle badge border border-surface-700 ${
                connected ? 'bg-success-500/10 text-success-400' : 'bg-warning-500/10 text-warning-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? 'animate-pulse-dot bg-success-400' : 'animate-pulse bg-warning-400'
                }`}
              />
              {connected ? 'Live' : 'подключение...'}
            </span>
          </div>
          {Object.values(online).filter((member) => member.isOnline).length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              Сейчас никто из клана не в сети
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {Object.values(online)
                .filter((member) => member.isOnline)
                .sort((a, b) => (a.gameName ? -1 : 0) - (b.gameName ? -1 : 0))
                .map((member) => (
                  <div
                    key={member.steamId64}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-800/60"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        member.gameName ? 'animate-pulse-dot bg-primary-400' : 'bg-success-400'
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      ...{member.steamId64.slice(-7)}
                    </span>
                    {member.gameName ? (
                      <span className="max-w-32 truncate text-xs text-primary-300" title={member.gameName}>
                        {member.gameName}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-success-400">Онлайн</span>
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