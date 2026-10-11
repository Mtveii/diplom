import { useCallback, useEffect, useMemo, useState } from 'react'
import Chart from '@/components/Chart'
import { useAlerts } from '@/hooks/useAlerts'
import { useDashboard } from '@/hooks/useDashboard'
import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import { useLocale } from '@/hooks/useLocale'
import { useMonitoringCharts } from '@/hooks/useMonitoringCharts'
import { cleanPlace, hasGeoData } from '@/utils/geo'
import { alertsApi } from '@/services/api/alerts.api'
import { friendsApi } from '@/services/api/friends.api'
import { healthApi } from '@/services/api/health.api'
import { userNotificationsApi } from '@/services/api/notifications.api'
import { usersApi } from '@/services/api/users.api'
import type { AdminUserDto } from '@/types/auth'
import type { AlertRuleDto } from '@/types/alert'
import type { FriendRequestDto, UserNotificationDto } from '@/types/notification'
import type { SystemHealthDto } from '@/types/health'

type OpsTab = 'all' | '24h' | '12h' | '8h' | '3h'

const TABS: OpsTab[] = ['all', '24h', '12h', '8h', '3h']
const TAB_LABELS: Record<OpsTab, string> = { all: 'ALL', '24h': '24H', '12h': '12H', '8h': '8H', '3h': '3H' }

interface KpiCardProps {
  label: string
  value: string
  sub: string
  accent: string
}

function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-surface-700/60 bg-surface-900/60 px-3 py-2.5">
      <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 truncate font-mono text-xl font-bold tracking-tight text-white">{value}</div>
      <div className="truncate text-[10px] text-slate-500">{sub}</div>
      <div className={`mt-1.5 h-[3px] rounded-full bg-gradient-to-r ${accent}`} />
    </div>
  )
}

interface StatBoxProps {
  label: string
  value: string
  sub: string
  ratio: number
}

function StatBox({ label, value, sub, ratio }: StatBoxProps) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-surface-700/60 bg-surface-900/60 px-2.5 py-2">
      <div className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="truncate font-mono text-sm font-bold text-white">{value}</div>
      <div className="truncate text-[9px] text-slate-500">{sub}</div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-800">
        <div className="h-full rounded-full bg-primary-400" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  )
}

interface FeedItem {
  key: string
  time: number
  title: string
  kind: 'notification' | 'registration'
}

function seriesStats(values: number[]): { current: number; peak: number; avg: number; min: number } {
  if (values.length === 0) return { current: 0, peak: 0, avg: 0, min: 0 }
  const peak = Math.max(...values)
  const min = Math.min(...values)
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  return { current: values[values.length - 1] ?? 0, peak, avg, min }
}

export default function OperationsPage() {
  const { t, locale } = useLocale()
  const { summary, loading: summaryLoading, reload: reloadSummary } = useDashboard()
  const { activity, registrations, setPeriod, loading: chartsLoading, reload: reloadCharts } = useMonitoringCharts()
  const { unreadCount, loading: alertsLoading, reload: reloadAlerts } = useAlerts()
  const { users: onlineUsers, reload: reloadOnline } = useOnlineUsers()
  const [users, setUsers] = useState<AdminUserDto[]>([])
  const [rules, setRules] = useState<AlertRuleDto[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestDto[]>([])
  const [friendsTotal, setFriendsTotal] = useState(0)
  const [outgoingTotal, setOutgoingTotal] = useState(0)
  const [notifications, setNotifications] = useState<UserNotificationDto[]>([])
  const [notificationsTotal, setNotificationsTotal] = useState(0)
  const [backendLive, setBackendLive] = useState<boolean | null>(null)
  const [health, setHealth] = useState<SystemHealthDto | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now())
  const [tab, setTab] = useState<OpsTab>('all')

  useEffect(() => {
    setPeriod(tab === 'all' ? 'all' : 'day')
  }, [tab, setPeriod])

  const reloadStatics = useCallback(async () => {
    const [usersResult, rulesResult, healthResult, friendsResult, incomingResult, outgoingResult, notificationsResult] =
      await Promise.allSettled([
        usersApi.getUsers(),
        alertsApi.getRules(),
        healthApi.getHealth(),
        friendsApi.getFriends(1),
        friendsApi.getIncomingRequests(8),
        friendsApi.getOutgoingRequests(1),
        userNotificationsApi.getNotifications(10),
      ])
    if (usersResult.status === 'fulfilled') setUsers(usersResult.value)
    if (rulesResult.status === 'fulfilled') setRules(rulesResult.value.slice(0, 4))
    if (friendsResult.status === 'fulfilled') setFriendsTotal(friendsResult.value.totalCount)
    if (incomingResult.status === 'fulfilled') setIncomingRequests(incomingResult.value.items)
    if (outgoingResult.status === 'fulfilled') setOutgoingTotal(outgoingResult.value.totalCount)
    if (notificationsResult.status === 'fulfilled') {
      setNotifications(notificationsResult.value.items)
      setNotificationsTotal(notificationsResult.value.totalCount)
    }
    if (healthResult.status === 'fulfilled') {
      setBackendLive(healthResult.value.status === 'Healthy')
      setHealth(healthResult.value)
    } else {
      setBackendLive(false)
      setHealth(null)
    }
    setUpdatedAt(Date.now())
  }, [])

  useEffect(() => {
    void reloadStatics()
  }, [reloadStatics])

  const reloadAll = () => {
    reloadSummary()
    reloadCharts()
    reloadAlerts()
    reloadOnline()
    void reloadStatics()
  }

  const geoStats = useMemo(() => {
    const byCountry = new Map<string, number>()
    const byCity = new Map<string, number>()
    let withoutGeo = 0
    for (const user of onlineUsers) {
      const country = cleanPlace(user.country)
      const city = cleanPlace(user.city)
      if (country) byCountry.set(country, (byCountry.get(country) ?? 0) + 1)
      if (city) byCity.set(city, (byCity.get(city) ?? 0) + 1)
      if (!hasGeoData(user)) withoutGeo += 1
    }
    const top = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { countries: top(byCountry), cities: top(byCity), withoutGeo }
  }, [onlineUsers])

  const sliceCount = tab === '12h' ? 12 : tab === '8h' ? 8 : tab === '3h' ? 3 : null
  const shownActivity = sliceCount == null ? activity : activity.slice(-sliceCount)
  const shownRegistrations = sliceCount == null ? registrations : registrations.slice(-sliceCount)

  const total = summary?.totalMembers ?? 0
  const online = summary?.onlineNow ?? 0
  const sessions = summary?.playersToday ?? 0
  const activeAlerts = summary?.activeAlerts ?? unreadCount
  const banned = useMemo(() => users.filter((user) => user.isBanned).length, [users])
  const newTotal = useMemo(() => shownRegistrations.reduce((sum, point) => sum + point.value, 0), [shownRegistrations])
  const onlineShare = total > 0 ? Math.round((online / total) * 100) : 0

  const onlineStats = useMemo(() => seriesStats(shownActivity.map((point) => point.value)), [shownActivity])
  const regStats = useMemo(() => seriesStats(shownRegistrations.map((point) => point.value)), [shownRegistrations])

  const maxRuleThreshold = useMemo(() => Math.max(1, ...rules.map((rule) => rule.thresholdValue)), [rules])

  const feed = useMemo<FeedItem[]>(() => {
    const notificationItems: FeedItem[] = notifications.map((notification) => ({
      key: `notification-${notification.id}`,
      time: notification.createdAt == null ? NaN : new Date(notification.createdAt).getTime(),
      title: notification.text,
      kind: 'notification',
    }))
    const registrationItems: FeedItem[] = users.slice(0, 50).map((user) => ({
      key: `reg-${user.id}`,
      time: new Date(user.createdAt).getTime(),
      title: user.username,
      kind: 'registration',
    }))
    return [...notificationItems, ...registrationItems]
      .filter((item) => Number.isFinite(item.time))
      .sort((a, b) => b.time - a.time)
      .slice(0, 10)
  }, [notifications, users])

  const periodLabel = tab === 'all' ? TAB_LABELS.all : tab === '24h' ? TAB_LABELS['24h'] : TAB_LABELS[tab]
  const loading = summaryLoading || chartsLoading || alertsLoading
  const liveLabel = backendLive === false ? t.nav.offline : t.nav.live
  const updatedLabel = new Date(updatedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const onlineBoxes = [
    { label: t.operations.statCurrent, value: onlineStats.current, sub: TAB_LABELS[tab] },
    { label: t.operations.statPeak, value: onlineStats.peak, sub: TAB_LABELS[tab] },
    { label: t.operations.statAvg, value: Math.round(onlineStats.avg), sub: TAB_LABELS[tab] },
    { label: t.operations.statMin, value: onlineStats.min, sub: TAB_LABELS[tab] },
  ]
  const regBoxes = [
    { label: t.operations.statCurrent, value: regStats.current, sub: TAB_LABELS[tab] },
    { label: t.operations.statPeak, value: regStats.peak, sub: TAB_LABELS[tab] },
    { label: t.operations.statAvg, value: Math.round(regStats.avg), sub: TAB_LABELS[tab] },
    { label: `${t.operations.kpiNew} Σ`, value: newTotal, sub: TAB_LABELS[tab] },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          ПАНЕЛЬ: <strong className="text-slate-200">{t.operations.title}</strong>
        </span>
        <span className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${backendLive === false ? 'bg-rose-500' : 'bg-success-400 animate-pulse'}`} />
          БЭКЕНД: Slush API · {liveLabel} · {t.operations.updated}: {updatedLabel}
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex shrink-0 flex-col justify-center rounded-lg border border-surface-700/60 bg-surface-900/60 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Monitoring</div>
          <div className="text-xs font-bold text-success-400">{liveLabel}</div>
          <div className="text-[10px] text-slate-500">{updatedLabel}</div>
        </div>
        <KpiCard label={t.operations.kpiTotal} value={total.toLocaleString('ru-RU')} sub={`${banned.toLocaleString('ru-RU')} · ${t.operations.banned}`} accent="from-emerald-600 to-emerald-400" />
        <KpiCard label={t.operations.kpiOnline} value={online.toLocaleString('ru-RU')} sub={`${onlineShare}%`} accent="from-amber-600 to-amber-400" />
        <KpiCard label={t.operations.kpiSessions} value={sessions.toLocaleString('ru-RU')} sub={`${t.operations.stability}: ${summary?.networkStabilityPercent ?? 0}%`} accent="from-sky-600 to-sky-400" />
        <KpiCard label={t.operations.kpiNew} value={newTotal.toLocaleString('ru-RU')} sub={periodLabel} accent="from-emerald-600 to-emerald-400" />
        <KpiCard label={t.operations.kpiAlerts} value={activeAlerts.toLocaleString('ru-RU')} sub={`${unreadCount} · ${t.operations.unread}`} accent="from-amber-600 to-amber-400" />
        <button
          onClick={reloadAll}
          disabled={loading}
          title={t.operations.reload}
          className="btn-ghost flex w-10 shrink-0 items-center justify-center rounded-lg px-0 text-lg font-bold"
        >
          <svg
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-3">
        <div className="flex min-h-0 flex-col gap-3 xl:col-span-2">
          <div className="card card-hud flex min-h-0 flex-[1.5] flex-col p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-400">
                {t.operations.chartOnline} · {t.operations.updated}: {updatedLabel}
              </div>
              <div className="flex gap-1 rounded-lg border border-surface-700 bg-surface-800/40 p-0.5">
                {TABS.map((value) => (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors ${
                      tab === value ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {TAB_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-[180px] w-full flex-1">
              <Chart data={shownActivity} label={t.dashboard.seriesOnline} color="#7dd3fc" height="100%" />
            </div>
            <div className="mt-2 flex gap-2">
              {onlineBoxes.map((box) => (
                <StatBox key={box.label} label={box.label} value={box.value.toLocaleString('ru-RU')} sub={box.sub} ratio={onlineStats.peak > 0 ? box.value / onlineStats.peak : 0} />
              ))}
            </div>
          </div>

          <div className="card card-hud flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-400">
                {t.operations.chartNew} · {t.operations.updated}: {updatedLabel}
              </div>
            </div>
            <div className="min-h-[140px] w-full flex-1">
              <Chart data={shownRegistrations} label={t.dashboard.seriesNew} color="#a78bfa" height="100%" />
            </div>
            <div className="mt-2 flex gap-2">
              {regBoxes.map((box) => (
                <StatBox key={`${box.label}-${box.sub}`} label={box.label} value={box.value.toLocaleString('ru-RU')} sub={box.sub} ratio={regStats.peak > 0 ? box.value / regStats.peak : 0} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="card card-hud p-4">
            <div className="mb-2 text-[10px] text-slate-500">
              {t.operations.friendsTitle} · {t.operations.updated}: {updatedLabel}
            </div>
            <div className="mb-2 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-surface-800/60 px-1 py-1.5">
                <div className="font-mono text-sm font-bold text-white">{friendsTotal.toLocaleString('ru-RU')}</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-500">{t.operations.friendsLabel}</div>
              </div>
              <div className="rounded-lg bg-surface-800/60 px-1 py-1.5">
                <div className="font-mono text-sm font-bold text-success-400">{incomingRequests.length.toLocaleString('ru-RU')}</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-500">{t.operations.incomingLabel}</div>
              </div>
              <div className="rounded-lg bg-surface-800/60 px-1 py-1.5">
                <div className="font-mono text-sm font-bold text-white">{outgoingTotal.toLocaleString('ru-RU')}</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-500">{t.operations.outgoingLabel}</div>
              </div>
            </div>
            <div className="flex flex-col">
              {incomingRequests.length === 0 && <div className="py-2 text-xs text-slate-500">{t.operations.emptyEvents}</div>}
              {incomingRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between border-b border-surface-800/70 py-1.5 text-xs last:border-0">
                  <span className="truncate text-slate-300" title={request.username}>
                    {request.username}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-success-400">+1</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-hud p-4">
            <div className="mb-2 text-[10px] text-slate-500">
              {t.operations.geoTitle} · {t.operations.updated}: {updatedLabel}
            </div>
            {geoStats.countries.length === 0 && geoStats.cities.length === 0 && geoStats.withoutGeo === 0 && (
              <div className="py-2 text-xs text-slate-500">{t.operations.emptyEvents}</div>
            )}
            {geoStats.withoutGeo > 0 && (
              <div className="flex items-center gap-2 py-1 text-xs">
                <span className="w-24 shrink-0 truncate text-slate-500" title={t.geo.unknown}>
                  {t.geo.unknown}
                </span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-800">
                  <div
                    className="h-full rounded-full bg-slate-500"
                    style={{ width: `${Math.round((geoStats.withoutGeo / Math.max(1, onlineUsers.length)) * 100)}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono font-bold text-slate-400">{geoStats.withoutGeo}</span>
              </div>
            )}
            {geoStats.countries.length > 0 && (
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">{t.operations.countries}</div>
            )}
            <div className="flex flex-col">
              {geoStats.countries.map(([name, count]) => (
                <div key={`country-${name}`} className="flex items-center gap-2 py-1 text-xs">
                  <span className="w-24 shrink-0 truncate text-slate-300" title={name}>
                    {name}
                  </span>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-800">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{ width: `${Math.round((count / Math.max(1, onlineUsers.length)) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-mono font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
            {geoStats.cities.length > 0 && (
              <div className="mb-1 mt-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">{t.operations.cities}</div>
            )}
            <div className="flex flex-col">
              {geoStats.cities.map(([name, count]) => (
                <div key={`city-${name}`} className="flex items-center gap-2 py-1 text-xs">
                  <span className="w-24 shrink-0 truncate text-slate-300" title={name}>
                    {name}
                  </span>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-800">
                    <div
                      className="h-full rounded-full bg-success-400"
                      style={{ width: `${Math.round((count / Math.max(1, onlineUsers.length)) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-mono font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-hud p-4">
            <div className="mb-2 text-[10px] text-slate-500">{t.operations.limitsTitle}</div>
            <div className="flex flex-col gap-2.5">
              {rules.length === 0 && <div className="py-2 text-xs text-slate-500">{t.operations.emptyEvents}</div>}
              {rules.map((rule) => (
                <div key={rule.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-slate-300" title={rule.name}>
                      {rule.name}
                    </span>
                    <span className="shrink-0 font-mono font-bold text-white">{rule.thresholdValue}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-800">
                    <div
                      className={`h-full rounded-full ${rule.isActive ? 'bg-primary-400' : 'bg-slate-600'}`}
                      style={{ width: `${Math.min(100, Math.round((rule.thresholdValue / maxRuleThreshold) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-hud flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-2 text-[10px] text-slate-500">{t.health.title}</div>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
              {(!health || health.components.length === 0) && (
                <div className="py-2 text-xs text-slate-500">{t.operations.emptyEvents}</div>
              )}
              {(health?.components ?? []).map((component) => (
                <div
                  key={component.name}
                  className="flex items-center gap-2 rounded-lg bg-surface-800/60 px-2.5 py-1.5 text-[11px]"
                  title={component.message}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${component.healthy ? 'bg-success-400' : 'bg-rose-400'}`} />
                  <span className="min-w-0 flex-1 truncate text-slate-200">{component.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-400">
                    {component.latencyMs == null ? '—' : t.health.latency(component.latencyMs)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card card-hud px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {t.operations.notificationsTitle} · {notificationsTotal.toLocaleString('ru-RU')} · {t.operations.updated}: {updatedLabel}
          </span>
        </div>
        {feed.length === 0 ? (
          <div className="py-3 text-center text-xs text-slate-500">{t.operations.emptyEvents}</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {feed.map((item) => (
              <div key={item.key} className="flex w-52 shrink-0 items-center gap-2 rounded-lg bg-surface-800/60 px-2.5 py-2 text-[11px]">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.kind === 'notification' ? 'bg-sky-400' : 'bg-success-400'}`} />
                <span className="min-w-0 flex-1 truncate text-slate-200" title={item.title}>
                  {item.title}
                </span>
                <span className="shrink-0 font-mono text-[9px] text-slate-500">
                  {new Date(item.time).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
