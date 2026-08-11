import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Chart from '@/components/Chart'
import HeatmapChart from '@/components/HeatmapChart'
import Spinner from '@/components/Spinner'
import StatCard from '@/components/StatCard'
import { useAlerts } from '@/hooks/useAlerts'
import { useDashboard } from '@/hooks/useDashboard'
import { useMonitoringCharts } from '@/hooks/useMonitoringCharts'
import { analyticsApi } from '@/services/api/analytics.api'
import { formatHours, formatRelativeDate } from '@/utils/format'
import type { PeriodComparisonDto } from '@/types/analytics'

type TimeFilterKey = 'today' | 'week' | 'month'

const timeFilters: { key: TimeFilterKey; label: string; apiPeriod: 'day' | 'week' | 'month'; compareDays: number }[] = [
  { key: 'today', label: 'Сегодня', apiPeriod: 'day', compareDays: 1 },
  { key: 'week', label: '7 дней', apiPeriod: 'week', compareDays: 7 },
  { key: 'month', label: '30 дней', apiPeriod: 'month', compareDays: 30 },
]

const medalColors = ['text-warning-400', 'text-slate-300', 'text-amber-700']

const avatarColors = [
  'from-primary-500 to-accent-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-orange-500',
  'from-sky-500 to-indigo-500',
  'from-fuchsia-500 to-purple-500',
]

const quickActions = [
  {
    to: '/members',
    title: 'Управление участниками',
    description: 'Статусы, роли, профили Steam',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: 'text-primary-400',
    bg: 'from-primary-500/20 to-primary-500/5',
  },
  {
    to: '/applications',
    title: 'Заявки на вступление',
    description: 'Одобрение и отклонение заявок',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
    ),
    color: 'text-success-400',
    bg: 'from-success-500/20 to-success-500/5',
  },
  {
    to: '/games',
    title: 'Мониторинг игр и алерты',
    description: 'Онлайн, алерты, каталог игр',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12h4" />
        <path d="M14 12h.01" />
        <path d="M17 12h.01" />
        <path d="M6 16h4" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    ),
    color: 'text-accent-400',
    bg: 'from-accent-500/20 to-accent-500/5',
  },
  {
    to: '/analytics',
    title: 'Аналитика и отчёты',
    description: 'Retention, отток, когорты',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M7 13l4-4 4 4 5-5" />
      </svg>
    ),
    color: 'text-warning-400',
    bg: 'from-warning-500/20 to-warning-500/5',
  },
  {
    to: '/games',
    title: 'Последние алерты',
    description: 'Триггеры алертов и каналы',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    color: 'text-danger-400',
    bg: 'from-danger-500/20 to-danger-500/5',
  },
  {
    to: '/settings',
    title: 'Настройки клана',
    description: 'Каналы, роли, безопасность',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    color: 'text-slate-400',
    bg: 'from-slate-500/20 to-slate-500/5',
  },
]

function ProgressRing({
  percent,
  label,
  color,
}: {
  percent: number
  label: string
  color: string
}) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#16404f" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          {Math.round(percent)}%
        </div>
      </div>
      <div className="whitespace-pre-line text-center text-[11px] leading-tight text-slate-400">{label}</div>
    </div>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export default function DashboardPage() {
  const { summary, loading, reload: reloadSummary } = useDashboard()
  const { activity, heatmap, topPlayers, setPeriod, loading: chartsLoading, reload: reloadCharts } = useMonitoringCharts()
  const alerts = useAlerts()

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

  const onlinePercent = summary && summary.totalMembers > 0 ? (summary.onlineNow / summary.totalMembers) * 100 : 0
  const lastActivityAt = activity.length
    ? new Date(Math.max(...activity.map((point) => new Date(point.timestamp).getTime()))).toISOString()
    : null

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Дашборд клана</h1>
          <p className="mt-1 text-sm text-slate-400">Сводка активности Steam-клана в реальном времени</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success-400" />
            Live · обновлено {lastActivityAt ? formatRelativeDate(lastActivityAt, now) : '—'}
          </div>
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-800 disabled:opacity-60"
          >
            <svg
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
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
            Обновить
          </button>
          <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-900 p-1">
            {timeFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setTimeFilter(filter.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  timeFilter === filter.key
                    ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow'
                    : 'text-slate-400 hover:bg-surface-800'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Всего участников"
          value={summary?.totalMembers ?? 0}
          accent="slate"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Онлайн сейчас"
          value={summary?.onlineNow ?? 0}
          accent="green"
          hint="пульс клана в данный момент"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
          }
        />
        <StatCard
          label="Игроков сегодня"
          value={summary?.playersToday ?? 0}
          accent="blue"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 12h.01" />
              <path d="M10 12h.01" />
            </svg>
          }
        />
        <StatCard
          label="Игроков за период"
          value={comparison?.currentActivePlayers ?? '—'}
          accent="blue"
          delta={comparison?.activePlayersChangePercent ?? null}
          hint={`уникальных игроков за ${currentFilter.label.toLowerCase()}`}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v16a2 2 0 0 0 2 2h16" />
              <path d="M7 13l4-4 4 4 5-5" />
            </svg>
          }
        />
        <StatCard
          label="Сыграно за период"
          value={comparison ? formatHours(comparison.currentPlaytimeMinutes) : '—'}
          accent="amber"
          delta={comparison?.playtimeChangePercent ?? null}
          hint={`игровых часов за ${currentFilter.label.toLowerCase()}`}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />
        <StatCard
          label="Средний онлайн за период"
          value={comparison ? Math.round(comparison.currentAverageDailyOnline) : '—'}
          accent="green"
          delta={comparison?.averageOnlineChangePercent ?? null}
          hint={`в среднем в день за ${currentFilter.label.toLowerCase()}`}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Заявки на рассмотрении"
          value={summary?.pendingApplications ?? 0}
          accent="amber"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />
        <StatCard
          label="Активных алертов"
          value={summary?.activeAlerts ?? 0}
          accent="red"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Активность клана</h2>
          <p className="text-xs text-slate-500">
            Онлайн и занятость по времени суток · период {currentFilter.label.toLowerCase()}
          </p>
        </div>
        <Link
          to="/analytics"
          className="flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-800"
        >
          Открыть аналитику
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Chart
          label="Онлайн за период"
          data={activity.map((point) => ({ timestamp: point.timestamp, value: point.onlineCount }))}
        />
        <HeatmapChart data={heatmap} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Загрузка клана</h3>
          <div className="flex justify-around">
            <ProgressRing percent={onlinePercent} label="участников\nонлайн сейчас" color="#34d399" />
            <ProgressRing
              percent={summary && summary.totalMembers > 0 ? ((summary.activeThisWeek ?? 0) / summary.totalMembers) * 100 : 0}
              label="активность\nза неделю"
              color="#2dd4bf"
            />
            <ProgressRing
              percent={summary && summary.totalMembers > 0 ? ((summary.playersToday ?? 0) / summary.totalMembers) * 100 : 0}
              label="играли\nсегодня"
              color="#f59e0b"
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Топ игроков по playtime</h3>
            <span className="badge border border-surface-700 bg-surface-800/60 text-slate-300">
              за {currentFilter.label.toLowerCase()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {topPlayers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
                Нет данных за период — джоба сбора playtime ещё не отработала
              </div>
            ) : (
              topPlayers.map((player, index) => (
                <div
                  key={player.steamId64}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-800/60"
                >
                  <span className={`w-6 text-sm font-bold ${medalColors[index] ?? 'text-slate-500'}`}>
                    {index + 1}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                      avatarColors[index % avatarColors.length]
                    } text-[11px] font-bold text-white`}
                  >
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-sm">{player.username}</span>
                  <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
                    <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {player.hoursPlayed.toFixed(1)} ч
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Последние алерты</h3>
            {alerts.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500/20 px-1.5 text-[11px] font-bold text-danger-400">
                {alerts.unreadCount}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {alerts.history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
                Алертов пока не было — правила не настроены или джоба не отработала
              </div>
            ) : (
              alerts.history.slice(0, 5).map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => void alerts.markAsRead(alert.id)}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-800/60"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      alert.isRead
                        ? 'border-surface-700 bg-surface-800/40 text-slate-500'
                        : 'border-warning-500/40 bg-warning-500/10 text-warning-400'
                    }`}
                  >
                    <BellIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${alert.isRead ? 'text-slate-300' : 'font-medium text-slate-100'}`}>
                      {alert.ruleName}
                    </div>
                    <div className="truncate text-xs text-slate-500">{alert.message}</div>
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-500">{formatRelativeDate(alert.triggeredAt, now)}</div>
                </button>
              ))
            )}
          </div>
          <Link
            to="/games"
            className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-surface-700 bg-surface-800/40 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-800"
          >
            View all
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Быстрые действия</h3>
          <div className="flex flex-col gap-2.5">
            {quickActions.map((action) => (
              <Link
                key={`${action.to}-${action.title}`}
                to={action.to}
                className="group flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-800/40 p-3 transition-all hover:-translate-y-0.5 hover:border-surface-750"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.bg} ${action.color}`}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100">{action.title}</div>
                  <div className="truncate text-xs text-slate-500">{action.description}</div>
                </div>
                <svg
                  className="ml-auto h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}