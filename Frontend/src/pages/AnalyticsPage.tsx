import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Spinner from '@/components/Spinner'
import { chartTheme } from '@/styles/chartTheme'
import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import { monitoringApi } from '@/services/api/monitoring.api'
import { usersApi } from '@/services/api/users.api'
import type { DashboardSummaryDto } from '@/types/monitoring'
import type { AdminUserDto } from '@/types/auth'

interface GameDistributionPoint {
  name: string
  players: number
}

interface CountryPoint {
  country: string
  users: number
}

interface RegistrationPoint {
  date: string
  count: number
}

export default function AnalyticsPage() {
  const { users: onlineUsers, loading: onlineLoading } = useOnlineUsers()
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null)
  const [systemUsers, setSystemUsers] = useState<AdminUserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, usersData] = await Promise.all([
        monitoringApi.summary(),
        usersApi.getUsers(),
      ])
      setSummary(summaryData)
      setSystemUsers(usersData)
    } catch (err) {
      console.warn('[AnalyticsPage] Не удалось загрузить данные по пользователям', err)
      setSummary(null)
      setSystemUsers([])
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

  /** География онлайн-пользователей. */
  const countries = useMemo<CountryPoint[]>(() => {
    const byCountry = new Map<string, number>()
    for (const user of onlineUsers) {
      byCountry.set(user.country, (byCountry.get(user.country) ?? 0) + 1)
    }
    return [...byCountry.entries()]
      .map(([country, users]) => ({ country, users }))
      .sort((a, b) => b.users - a.users)
  }, [onlineUsers])

  /** Регистрации в системе по дням. */
  const registrations = useMemo<RegistrationPoint[]>(() => {
    const byDate = new Map<string, number>()
    for (const user of systemUsers) {
      const date = new Date(user.createdAt).toLocaleDateString('ru-RU')
      byDate.set(date, (byDate.get(date) ?? 0) + 1)
    }
    return [...byDate.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [systemUsers])

  const roleBreakdown = useMemo(() => {
    const byRole = new Map<string, number>()
    for (const user of systemUsers) {
      byRole.set(user.role, (byRole.get(user.role) ?? 0) + 1)
    }
    return [...byRole.entries()].sort((a, b) => b[1] - a[1])
  }, [systemUsers])

  const bannedCount = useMemo(() => systemUsers.filter((user) => user.isBanned).length, [systemUsers])

  const tooltipStyle = {
    background: chartTheme.tooltip.background,
    border: chartTheme.tooltip.border,
    borderRadius: chartTheme.tooltip.borderRadius,
    boxShadow: chartTheme.tooltip.boxShadow,
    fontSize: chartTheme.tooltip.fontSize,
  }

  if (loading || onlineLoading) {
    return <Spinner label="Загрузка аналитики по пользователям..." fullPage />
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-white">Аналитика по пользователям</h1>
          <p className="hidden sm:block mt-0.5 text-xs sm:text-sm text-slate-400">
            Активность, география и статистика всех пользователей сети Slush
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
          Обновить
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card card-hud p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Пользователей в системе</div>
          <div className="mt-1 text-xl font-bold text-white">{systemUsers.length}</div>
        </div>
        <div className="card card-hud p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Онлайн сейчас</div>
          <div className="mt-1 text-xl font-bold text-success-400">{onlineUsers.length}</div>
        </div>
        <div className="card card-hud p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Всего в сети Slush</div>
          <div className="mt-1 text-xl font-bold text-white">{summary?.totalMembers ?? '—'}</div>
        </div>
        <div className="card card-hud p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Заблокировано</div>
          <div className={`mt-1 text-xl font-bold ${bannedCount > 0 ? 'text-danger-400' : 'text-white'}`}>{bannedCount}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card card-hud p-5 xl:col-span-2">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">Топ-10 пользователей по времени в игре</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">часы · сейчас в сети</span>
          </div>
          {topByPlaytime.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              Нет пользователей в сети
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
                  <Bar dataKey="hours" name="Часов" fill="#60a5fa" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card card-hud p-5">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">Во что играют сейчас</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">игроков на игру</span>
          </div>
          {gameDistribution.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              Сейчас никто не играет
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
            <h3 className="card-header-hud__title">География онлайн-пользователей</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">по странам</span>
          </div>
          {countries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              Нет данных о местоположении
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {countries.map((item) => (
                <span
                  key={item.country}
                  className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs text-slate-300"
                >
                  {item.country}: <strong className="text-white">{item.users}</strong>
                </span>
              ))}
            </div>
          )}

          <div className="card-header-hud mt-6 mb-3">
            <h3 className="card-header-hud__title text-sm">Роли пользователей системы</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleBreakdown.map(([role, count]) => (
              <span key={role} className="badge border border-surface-700 bg-surface-800 text-slate-300">
                {role}: <strong className="text-white ml-1">{count}</strong>
              </span>
            ))}
            {roleBreakdown.length === 0 && <span className="text-xs text-slate-500">Нет данных</span>}
          </div>
        </div>

        <div className="card card-hud p-5 xl:col-span-2">
          <div className="card-header-hud mb-4">
            <h3 className="card-header-hud__title">Регистрации пользователей по дням</h3>
            <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">новые аккаунты</span>
          </div>
          {registrations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
              Нет данных о регистрациях
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={registrations} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip cursor={{ fill: '#172554', opacity: 0.4 }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Регистраций" fill="#34d399" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
