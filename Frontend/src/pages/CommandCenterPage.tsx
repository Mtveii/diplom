import { useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UsersGlobe } from '../components/UsersGlobe'
import { alertsApi } from '@/services/api/alerts.api'
import { monitoringApi } from '@/services/api/monitoring.api'
import { usersApi } from '@/services/api/users.api'
import { useLocale } from '@/hooks/useLocale'
import { formatDayMonth, formatNumber } from '@/utils/format'
import type { AlertHistoryDto } from '@/types/alert'

interface PersonnelStats {
  total: number
  online: number
  banned: number
  elevatedRoles: number
  playersToday: number
  networkStability: number
}

interface BarItem {
  day: string
  orange: number
  cyan: number
  peak?: boolean
}

export default function CommandCenterPage() {
  const { t, locale } = useLocale()
  const formatCount = (value: number): string => formatNumber(value, locale)
  const [timeStr, setTimeStr] = useState('15:21:03')
  const [dateStr, setDateStr] = useState('2026.08.18')

  // По умолчанию — 0, как требует ТЗ (если БД пустая или не отвечает — останется 0)
  const [stats, setStats] = useState<PersonnelStats>({
    total: 0,
    online: 0,
    banned: 0,
    elevatedRoles: 0,
    playersToday: 0,
    networkStability: 0,
  })
  const [bars, setBars] = useState<BarItem[]>(
    Array.from({ length: 11 }, (_, index) => ({
      day: String(index + 2).padStart(2, '0'),
      orange: 0,
      cyan: 0,
    })),
  )
  const [peakValue, setPeakValue] = useState(0)
  const [stream, setStream] = useState<AlertHistoryDto[]>([])
  const [alertsTrend, setAlertsTrend] = useState<AlertHistoryDto[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      const secs = String(now.getSeconds()).padStart(2, '0')
      setTimeStr(`${hours}:${mins}:${secs}`)
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      setDateStr(`${year}.${month}.${day}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // Параллельно парсим БД, каждая ветка отдельно обрабатывает ошибку -> 0
      const summaryPromise = monitoringApi.summary().catch(() => null)
      const usersPromise = usersApi.getUsers().catch(() => [] as never)
      const activityPromise = monitoringApi.activity('week').catch(() => [])
      const historyPromise = alertsApi.getHistory(100).catch(() => [] as AlertHistoryDto[])

      const [summaryResult, usersResult, activityResult, historyResult] = await Promise.all([
        summaryPromise,
        usersPromise,
        activityPromise,
        historyPromise,
      ])

      if (cancelled) return

      // Если БД не отвечает — все остаются 0 (защита через catch выше)
      const users = Array.isArray(usersResult) ? usersResult : []
      const total = summaryResult?.totalMembers ?? (users.length || 0)
      const online = summaryResult?.onlineNow ?? 0
      const banned = users.filter((user) => user.isBanned).length
      const elevatedRoles = users.filter((user) => user.role && user.role !== 'User').length
      const playersToday = summaryResult?.playersToday ?? 0
      const networkStability = summaryResult?.networkStabilityPercent ?? (total > 0 ? (online / total) * 100 : 0)

      setStats({
        total,
        online,
        banned,
        elevatedRoles,
        playersToday,
        networkStability,
      })

      // Динамика активности: берём последние 11 дней, оранжевый = онлайн, бирюзовый = новые аккаунты
      const now = new Date()
      const days: BarItem[] = []
      let peak = 0
      for (let index = 10; index >= 0; index -= 1) {
        const date = new Date(now)
        date.setDate(now.getDate() - index)
        const dayKey = date.toISOString().slice(0, 10)
        const label = String(date.getDate()).padStart(2, '0')

        const activityForDay = (Array.isArray(activityResult) ? activityResult : []).filter(
          (point) => point.timestamp.slice(0, 10) === dayKey,
        )
        const onlineForDay = activityForDay.length > 0 ? Math.max(...activityForDay.map((point) => point.onlineCount)) : 0
        const registrationsForDay = users.filter((user) => user.createdAt.slice(0, 10) === dayKey).length

        if (onlineForDay > peak) peak = onlineForDay
        if (registrationsForDay > peak) peak = registrationsForDay

        days.push({ day: label, orange: onlineForDay, cyan: registrationsForDay })
      }
      // Помечаем пиковый столбец
      const maxValue = peak
      const withPeak = days.map((item) => ({
        ...item,
        peak: maxValue > 0 && (item.orange === maxValue || item.cyan === maxValue),
      }))
      setBars(withPeak)
      setPeakValue(maxValue)
      const fullHistory = Array.isArray(historyResult) ? historyResult : []
      setAlertsTrend(fullHistory)
      setStream(fullHistory.slice(0, 8))
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const rolePercent = useMemo(() => (stats.total > 0 ? (stats.elevatedRoles / stats.total) * 100 : 0), [stats.elevatedRoles, stats.total])
  const sessionPercent = useMemo(
    () => (stats.total > 0 ? Math.min(100, (stats.playersToday / Math.max(1, stats.total)) * 100) : 0),
    [stats.playersToday, stats.total],
  )
  const readinessPercent = useMemo(() => {
    if (stats.total === 0) return 0
    if (Number.isFinite(stats.networkStability) && stats.networkStability > 0) return Math.min(100, stats.networkStability)
    return (stats.online / stats.total) * 100
  }, [stats.networkStability, stats.online, stats.total])

  const alertsByDay = useMemo(() => {
    const byDay = new Map<string, number>()
    const offset = new Date().getTimezoneOffset() * 60_000
    const now = Date.now()
    for (let i = 13; i >= 0; i -= 1) {
      byDay.set(new Date(now - i * 24 * 3600_000).toISOString().slice(0, 10), 0)
    }
    for (const alert of alertsTrend) {
      const key = new Date(alert.triggeredAt).toISOString().slice(0, 10)
      if (byDay.has(key)) {
        byDay.set(key, (byDay.get(key) ?? 0) + 1)
      }
    }
    return Array.from(byDay, ([day, count]) => ({
      day: formatDayMonth(new Date(new Date(day).getTime() + offset), locale),
      count,
    }))
  }, [alertsTrend, locale])

  const trendMax = Math.max(1, ...alertsByDay.map((item) => item.count))

  const offlineCount = Math.max(0, stats.total - stats.online)
  const groupA = stats.online
  const groupB = Math.max(0, offlineCount - stats.banned)
  const anomalies = stats.banned

  // Кольца: считаем dashoffset пропорционально заполнению (201 = длина окружности при r=32)
  const ring1Total = Math.max(1, stats.total)
  const ring1Fill = stats.total > 0 ? stats.online / ring1Total : 0
  const ring1Offset = 201 * (1 - ring1Fill)
  const ring2Total = Math.max(1, stats.playersToday || 1)
  const ring2Fill = stats.playersToday > 0 ? stats.online / ring2Total : 0
  const ring2Offset = 201 * (1 - ring2Fill)

  return (
    <div className="relative flex h-[calc(100vh-5rem)] w-full flex-col overflow-hidden bg-[#070b14] p-3 text-slate-100 select-none">
      {/* Top Bar Header */}
      <header className="flex items-center justify-between border-b border-blue-900/40 pb-2 px-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-black tracking-wider text-xl italic bg-gradient-to-r from-orange-500 via-amber-400 to-primary-400 bg-clip-text text-transparent">
            <span>STEAM</span>
            <span className="text-xs font-normal not-italic text-slate-400 tracking-normal border-l border-slate-700 pl-2">
              {t.commandCenter.brandSub}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-widest text-[10px]">{t.commandCenter.time}</span>
            <span className="font-mono font-bold text-primary-400">{timeStr}</span>
            <span className="font-mono text-slate-400">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-warning-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            <span className="font-bold text-white">32°C</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded text-[11px]">
            <span className="text-slate-400">{t.commandCenter.network}</span>
            <span className="font-bold text-success-400">99.9%</span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout (Left Panel, Center Globe, Right Panel) */}
      <div className="mt-3 grid flex-1 grid-cols-12 gap-3 min-h-0">
        {/* Left Column (Stats & Distribution) */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          {/* Panel 1: Personnel Statistics — мониторинг БД */}
          <div className="relative rounded-xl border border-blue-900/60 bg-blue-950/20 p-3.5 backdrop-blur-md shadow-lg">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
                {t.commandCenter.personnel}
              </h3>
              <span className="text-[10px] text-slate-500">{t.commandCenter.overviewStatus}</span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-xs border-b border-blue-950 pb-2.5">
              <div>
                <div className="text-[10px] text-slate-400">{t.commandCenter.totalMembers}</div>
                <div className="text-lg font-black text-white font-mono tracking-tight">{formatCount(stats.total)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{t.commandCenter.activeOnline}</div>
                <div className="text-lg font-black text-success-400 font-mono tracking-tight">{formatCount(stats.online)}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">{t.commandCenter.ranksRoles}</span>
                  <span className="font-mono text-primary-400">{rolePercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/50">
                  <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full" style={{ width: `${rolePercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">{t.commandCenter.steamSessions}</span>
                  <span className="font-mono text-success-400">{sessionPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/50">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${sessionPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">{t.commandCenter.userReadiness}</span>
                  <span className="font-mono text-amber-400">{readinessPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/50">
                  <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{ width: `${readinessPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-blue-950/60 pt-2">
              <span>{formatCount(Math.floor(stats.total * 0.08))}</span>
              <span>{formatCount(Math.floor(stats.total * 0.33))}</span>
              <span>{formatCount(Math.floor(stats.total * 0.66))}</span>
              <span>{formatCount(stats.total)}</span>
            </div>
          </div>

          {/* Panel 2: Data Distribution — мониторинг БД */}
          <div className="relative flex-1 rounded-xl border border-blue-900/60 bg-blue-950/20 p-3.5 backdrop-blur-md shadow-lg flex flex-col justify-between">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                {t.commandCenter.distribution}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              {/* Ring 1 — всего пользователей */}
              <div className="flex flex-col items-center">
                <div className="relative h-20 w-20 flex items-center justify-center">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1e3a8a" strokeWidth="6" />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="6"
                      strokeDasharray="201"
                      strokeDashoffset={ring1Offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-black text-white">{formatCount(stats.total)}</span>
                    <span className="text-[9px] text-slate-400">{t.common.total}</span>
                  </div>
                </div>
              </div>

              {/* Stats right of ring 1 */}
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between border-b border-blue-950 pb-1">
                  <span className="text-slate-400">{t.commandCenter.onlineLabel}</span>
                  <span className="font-mono font-bold text-white">{formatCount(groupA)}</span>
                </div>
                <div className="flex justify-between border-b border-blue-950 pb-1">
                  <span className="text-slate-400">{t.commandCenter.offlineLabel}</span>
                  <span className="font-mono font-bold text-white">{formatCount(groupB)}</span>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span className="text-slate-400">{t.commandCenter.bannedLabel}</span>
                  <span className="font-mono font-bold text-amber-400">{formatCount(anomalies)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center border-t border-blue-950 pt-2 mt-2">
              {/* Ring 2 — сессии */}
              <div className="flex flex-col items-center">
                <div className="relative h-16 w-16 flex items-center justify-center">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1e3a8a" strokeWidth="6" />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="6"
                      strokeDasharray="201"
                      strokeDashoffset={ring2Offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-black text-white">{formatCount(stats.playersToday)}</span>
                    <span className="text-[9px] text-slate-400">{t.commandCenter.sessionsLabel}</span>
                  </div>
                </div>
              </div>

              {/* Stats right of ring 2 */}
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between border-b border-blue-950 pb-1">
                  <span className="text-slate-400">{t.commandCenter.todayLabel}</span>
                  <span className="font-mono font-bold text-white">{formatCount(stats.playersToday)}</span>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span className="text-slate-400">{t.commandCenter.onlinePeak}</span>
                  <span className="font-mono font-bold text-white">{formatCount(stats.online)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: 3D Globe Visualization with Floating Tooltips */}
        <div className="col-span-6 relative rounded-xl border border-blue-900/60 bg-[#040812] overflow-hidden flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />

          {/* 3D Interactive Globe via react-globe.gl & SignalR.
              Локальна межа: без WebGL (або без unpkg-текстур) падає тільки
              глобус, а не вся сторінка. */}
          <div className="absolute inset-0 z-0">
            <ErrorBoundary
              fallback={
                <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs text-slate-500">
                  {t.commandCenter.globeFallback}
                </div>
              }
            >
              <UsersGlobe />
            </ErrorBoundary>
          </div>
        </div>

        {/* Right Column (Charts & Flight Table) */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          {/* Panel 3: Flight/Activity Distribution Bar Chart — мониторинг БД */}
          <div className="relative rounded-xl border border-blue-900/60 bg-blue-950/20 p-3.5 backdrop-blur-md shadow-lg">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warning-400" />
                {t.commandCenter.activityDynamics}
              </h3>
              <span className="text-[10px] text-slate-400">
                {t.commandCenter.peak11(formatCount(peakValue))}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-orange-500" /> {t.commandCenter.legendOnline}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-success-400" /> {t.commandCenter.legendNew}
              </span>
            </div>

            {/* Bar Chart — данные из БД */}
            <div className="h-28 w-full flex items-end justify-between gap-1 pt-4 border-b border-blue-950">
              {bars.map((item) => {
                const max = Math.max(1, peakValue)
                return (
                  <div key={item.day} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                    {item.peak && max > 0 && <span className="text-[9px] font-bold text-orange-400">{max}</span>}
                    <div className="w-full flex items-end justify-center gap-0.5 h-20">
                      <div className="w-2 bg-orange-500 rounded-t" style={{ height: `${(item.orange / max) * 100}%` }} />
                      <div className="w-2 bg-success-400 rounded-t" style={{ height: `${(item.cyan / max) * 100}%` }} />
                    </div>
                    <span className="text-[9px] text-slate-500">{item.day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mini alerts trend — 14 днів */}
          <div className="relative rounded-xl border border-blue-900/60 bg-blue-950/20 p-3.5 backdrop-blur-md shadow-lg">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-danger-400" />
                {t.trend.title}
              </h3>
            </div>

            {alertsByDay.every((item) => item.count === 0) ? (
              <div className="py-3 text-center text-[11px] text-slate-500">{t.trend.empty}</div>
            ) : (
              <div className="flex h-20 items-stretch justify-between gap-1">
                {alertsByDay.map((item, index) => (
                  <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className="w-full max-w-3 rounded-t bg-primary-500/80"
                      style={{ height: `${Math.max(3, (item.count / trendMax) * 100)}%` }}
                      title={`${item.day}: ${item.count}`}
                    />
                    <span className="truncate text-[8px] text-slate-600">{index % 2 === 0 ? item.day : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel 4: Detailed Flight / Activity Stream Table — мониторинг БД */}
          <div className="relative flex-1 rounded-xl border border-blue-900/60 bg-blue-950/20 p-3 backdrop-blur-md shadow-lg flex flex-col min-h-0">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                {t.commandCenter.activityLog}
              </h3>
            </div>

            <div className="grid grid-cols-12 text-[10px] text-slate-400 border-b border-blue-900/60 pb-1 px-1 font-semibold">
              <span className="col-span-3">{t.commandCenter.colDate}</span>
              <span className="col-span-3">{t.commandCenter.colCode}</span>
              <span className="col-span-5">{t.commandCenter.colRoute}</span>
              <span className="col-span-1 text-right">{t.commandCenter.colAct}</span>
            </div>

            <div className="mt-1 flex-1 overflow-y-auto pr-1 flex flex-col gap-1 text-[11px]">
              {stream.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-slate-500">{t.commandCenter.emptyStream}</div>
              ) : (
                stream.map((row) => {
                  const date = new Date(row.triggeredAt)
                  const time = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
                  const code = row.ruleName.slice(0, 6).toUpperCase() || 'ALERT'
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 items-center rounded px-1 py-1 bg-blue-950/30 hover:bg-blue-900/40 transition-colors font-mono text-[10px]"
                    >
                      <span className="col-span-3 text-slate-400">{time}</span>
                      <span className="col-span-3 text-primary-300 font-bold">{code}</span>
                      <span className="col-span-5 text-slate-200 truncate" title={row.message}>
                        {row.message || '—'}
                      </span>
                      <span className="col-span-1 text-right font-bold text-success-400">{row.isRead ? 0 : 1}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
    </div>
  )
}
