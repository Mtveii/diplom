import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DonutChart, { type DonutChartItem } from '@/components/DonutChart'
import Spinner from '@/components/Spinner'
import { chartTheme } from '@/styles/chartTheme'
import { useLocale } from '@/hooks/useLocale'
import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import { analyticsApi } from '@/services/api/analytics.api'
import { monitoringApi } from '@/services/api/monitoring.api'
import { usersApi } from '@/services/api/users.api'
import { toast } from '@/store/toastStore'
import { formatDay } from '@/utils/format'
import { groupUsersByCountry } from '@/utils/geo'
import type { ChurnRiskDto, CohortRowDto, PeriodComparisonDto, RetentionPointDto } from '@/types/analytics'
import type { DashboardSummaryDto } from '@/types/monitoring'
import type { AdminUserDto } from '@/types/auth'

interface GameDistributionPoint {
  name: string
  players: number
}

interface RegistrationPoint {
  date: string
  count: number
}

const ROLE_COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#f87171', '#22d3ee']

export default function AnalyticsPage() {
  const { t, locale } = useLocale()
  const { users: onlineUsers, loading: onlineLoading } = useOnlineUsers()
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null)
  const [systemUsers, setSystemUsers] = useState<AdminUserDto[]>([])
  const [retention, setRetention] = useState<RetentionPointDto[]>([])
  const [churn, setChurn] = useState<ChurnRiskDto[]>([])
  const [cohorts, setCohorts] = useState<CohortRowDto[]>([])
  const [compare, setCompare] = useState<PeriodComparisonDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, usersData, retentionData, churnData, cohortsData, compareData] = await Promise.all([
        monitoringApi.summary(),
        usersApi.getUsers(),
        analyticsApi.retention().catch(() => [] as RetentionPointDto[]),
        analyticsApi.churnRisk().catch(() => [] as ChurnRiskDto[]),
        analyticsApi.cohorts().catch(() => [] as CohortRowDto[]),
        analyticsApi.compare(),
      ])
      setSummary(summaryData)
      setSystemUsers(usersData)
      setRetention(retentionData)
      setChurn(churnData)
      setCohorts(cohortsData)
      setCompare(compareData)
    } catch (err) {
      console.warn('[AnalyticsPage] Не удалось загрузить данные по пользователям', err)
      setSummary(null)
      setSystemUsers([])
      setRetention([])
      setChurn([])
      setCohorts([])
      setCompare(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await reload()
    } finally {
      setRefreshing(false)
    }
  }

  const handleExport = async (format: 0 | 1) => {
    setExporting(true)
    try {
      await analyticsApi.exportReport(format)
      toast.success(t.analytics.exportDone)
    } catch {
      toast.error(t.analytics.exportFail)
    } finally {
      setExporting(false)
    }
  }

  /** Топ-10 пользователей по наигранным часам (среди тех, кто сейчас в сети Slush). */
  const topByPlaytime = useMemo(
    () =>
      [...onlineUsers]
        .sort((a, b) => b.playtimeHours - a.playtimeHours)
        .slice(0, 10)
        .map((user) => ({ name: user.nickname, hours: Math.round(user.playtimeHours) })),
    [onlineUsers],
  )

  /** Во что играют пользователи прямо сейчас. */
  const gameDistribution = useMemo<GameDistributionPoint[]>(() => {
    const byGame = new Map<string, number>()
    for (const user of onlineUsers) {
      if (!user.currentGame) continue
      byGame.set(user.currentGame, (byGame.get(user.currentGame) ?? 0) + 1)
    }
    return [...byGame.entries()]
      .map(([name, players]) => ({ name, players }))
      .sort((a, b) => b.players - a.players)
      .slice(0, 8)
  }, [onlineUsers])

  /** География онлайн-пользователей (пустые страны бекенда пропускаем). */
  const countries = useMemo(() => groupUsersByCountry(onlineUsers), [onlineUsers])

  /** Регистрации в системе по дням. */
  const registrations = useMemo<RegistrationPoint[]>(() => {
    const byDate = new Map<string, number>()
    for (const user of systemUsers) {
      const date = formatDay(user.createdAt, locale)
      byDate.set(date, (byDate.get(date) ?? 0) + 1)
    }
    return [...byDate.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [systemUsers, locale])

  const roleBreakdown = useMemo(() => {
    const byRole = new Map<string, number>()
    for (const user of systemUsers) {
      byRole.set(user.role, (byRole.get(user.role) ?? 0) + 1)
    }
    return [...byRole.entries()].sort((a, b) => b[1] - a[1])
  }, [systemUsers])

  const bannedCount = useMemo(() => systemUsers.filter((user) => user.isBanned).length, [systemUsers])

  const rolesDonut = useMemo<DonutChartItem[]>(
    () =>
      roleBreakdown.map(([role, count], index) => ({
        name: role,
        value: count,
        color: ROLE_COLORS[index % ROLE_COLORS.length],
      })),
    [roleBreakdown],
  )

  const statusDonut = useMemo<DonutChartItem[]>(
    () => [
      { name: t.users.active, value: systemUsers.length - bannedCount, color: '#34d399' },
      { name: t.users.banned, value: bannedCount, color: '#f87171' },
    ],
    [systemUsers.length, bannedCount, t],
  )

  const topCountries = useMemo(() => countries.slice(0, 10), [countries])

  const tooltipStyle = {
    background: chartTheme.tooltip.background,
    border: chartTheme.tooltip.border,
    borderRadius: chartTheme.tooltip.borderRadius,
    boxShadow: chartTheme.tooltip.boxShadow,
    fontSize: chartTheme.tooltip.fontSize,
  }

  if (loading || onlineLoading) {
    return <Spinner label={t.analytics.loading} fullPage />
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-white">{t.analytics.title}</h1>
          <p className="hidden sm:block mt-0.5 text-xs sm:text-sm text-slate-400">
            {t.analytics.subtitle}
          </p>
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
          {t.common.refresh}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card card-hud p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t.analytics.inSystem}</div>
          <div className="mt-1 text-xl font-bold text-white">{systemUsers.length}</div>
        </div>
        <div className="card card-hud p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t.analytics.onlineNow}</div>
          <div className="mt-1 text-xl font-bold text-success-400">{onlineUsers.length}</div>
        </div>
        <div className="card card-hud p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t.analytics.totalSlush}</div>
          <div className="mt-1 text-xl font-bold text-white">{summary?.totalMembers ?? '—'}</div>
        </div>
        <div className="card card-hud p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t.analytics.blocked}</div>
          <div className={`mt-1 text-xl font-bold ${bannedCount > 0 ? 'text-danger-400' : 'text-white'}`}>{bannedCount}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card card-hud p-5 xl:col-span-2">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">{t.analytics.topPlaytime}</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">{t.analytics.hoursOnline}</span>
          </div>
          {topByPlaytime.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.analytics.noneOnline}
            </div>
          ) : (
            <div style={{ height: Math.max(180, topByPlaytime.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topByPlaytime} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: '#172554', opacity: 0.4 }} contentStyle={tooltipStyle} />
                  <Bar dataKey="hours" name={t.analytics.hoursBar} fill="#60a5fa" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">{t.analytics.playingNow}</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">{t.analytics.playersPerGame}</span>
          </div>
          {gameDistribution.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.analytics.nobodyPlaying}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {gameDistribution.map((game) => (
                <div key={game.name} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{game.name}</span>
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-800">
                    <div
                      className="h-full rounded-full bg-primary-400"
                      style={{ width: `${(game.players / gameDistribution[0].players) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-semibold text-primary-300">{game.players}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">{t.analytics.geo}</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">{t.analytics.byCountry}</span>
          </div>
          {topCountries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.analytics.noGeo}
            </div>
          ) : (
            <div style={{ height: Math.max(140, topCountries.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCountries} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="country"
                    width={120}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: '#172554', opacity: 0.4 }} contentStyle={tooltipStyle} />
                  <Bar dataKey="users" name={t.analytics.usersBar} fill="#22d3ee" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card-header-hud mt-6 mb-3">
            <h3 className="card-header-hud__title text-sm">{t.analytics.roles}</h3>
          </div>
          {roleBreakdown.length === 0 ? (
            <span className="text-xs text-slate-500">{t.common.noData}</span>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <div className="mb-2 text-xs font-medium text-slate-400">{t.analytics.rolesChart}</div>
                <DonutChart
                  data={rolesDonut}
                  size={150}
                  centerValue={systemUsers.length}
                  centerLabel={t.analytics.totalLabel}
                />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-slate-400">{t.analytics.statusChart}</div>
                <DonutChart
                  data={statusDonut}
                  size={150}
                  centerValue={bannedCount}
                  centerLabel={t.analytics.blocked}
                />
              </div>
            </div>
          )}
        </div>

        <div className="card card-hud p-5 xl:col-span-2">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">{t.analytics.registrations}</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">{t.analytics.newAccounts}</span>
          </div>
          {registrations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.analytics.noRegistrations}
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={registrations} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip cursor={{ fill: '#172554', opacity: 0.4 }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name={t.analytics.registrationsBar} fill="#34d399" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card card-hud p-5 xl:col-span-2">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">{t.analytics.srvRetention}</h3>
          </div>
          {retention.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.common.noData}
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retention} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip cursor={{ stroke: chartTheme.cursorStroke, strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="retentionRate" name={t.analytics.srvRetention} stroke="#a78bfa" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">{t.analytics.srvChurn}</h3>
          </div>
          {churn.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.common.noData}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="pb-2">{t.users.colUser}</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2 text-right">{t.analytics.churnDays}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {churn.map((row) => (
                    <tr key={row.userId} className="border-t border-surface-800/60 transition-colors hover:bg-surface-800/40">
                      <td className="max-w-32 truncate py-2 font-medium text-slate-100">{row.username ?? t.common.noName}</td>
                      <td className="max-w-40 truncate py-2 text-xs text-slate-400">{row.email ?? '—'}</td>
                      <td className="py-2 text-right font-semibold text-warning-400">{row.daysInactive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">{t.analytics.srvCompare}</h3>
          </div>
          {compare == null ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.common.noData}
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-surface-700/60 bg-surface-900/60 px-3 py-2.5">
                <span className="text-slate-400">{t.analytics.inSystem}</span>
                <span className="font-semibold text-slate-100">
                  {compare.usersPeriodA} → {compare.usersPeriodB}{' '}
                  <span className={compare.usersGrowthPercent >= 0 ? 'text-success-400' : 'text-danger-400'}>
                    ({compare.usersGrowthPercent >= 0 ? '+' : ''}{compare.usersGrowthPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-surface-700/60 bg-surface-900/60 px-3 py-2.5">
                <span className="text-slate-400">{t.analytics.srvActive}</span>
                <span className="font-semibold text-slate-100">
                  {compare.activePeriodA} → {compare.activePeriodB}{' '}
                  <span className={compare.activeGrowthPercent >= 0 ? 'text-success-400' : 'text-danger-400'}>
                    ({compare.activeGrowthPercent >= 0 ? '+' : ''}{compare.activeGrowthPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => void handleExport(0)} disabled={exporting} className="btn-ghost h-8 flex-1 px-3 text-xs disabled:opacity-50">
                  PDF
                </button>
                <button onClick={() => void handleExport(1)} disabled={exporting} className="btn-ghost h-8 flex-1 px-3 text-xs disabled:opacity-50">
                  Excel
                </button>
              </div>
              <div className="text-xs text-slate-500">{t.analytics.exportReport}</div>
            </div>
          )}
        </div>

        <div className="card card-hud p-5 xl:col-span-2">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">{t.analytics.srvCohorts}</h3>
          </div>
          {cohorts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              {t.common.noData}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="pb-2">{t.analytics.srvMonth}</th>
                    <th className="pb-2 text-right">{t.analytics.srvTotal}</th>
                    {(cohorts[0].retentionByMonth ?? []).map((_, index) => (
                      <th key={index} className="pb-2 text-right">M{index + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {cohorts.map((row, index) => (
                    <tr key={row.month ?? index} className="border-t border-surface-800/60 transition-colors hover:bg-surface-800/40">
                      <td className="py-2 font-medium text-slate-100">{row.month ?? '—'}</td>
                      <td className="py-2 text-right tabular-nums">{row.totalUsers}</td>
                      {(row.retentionByMonth ?? []).map((value, cellIndex) => (
                        <td key={cellIndex} className="py-2 text-right tabular-nums text-slate-400">
                          {Number(value.toFixed(1))}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
