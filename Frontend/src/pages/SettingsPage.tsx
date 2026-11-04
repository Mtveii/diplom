import { useCallback, useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import Chart, { type ChartPoint } from '@/components/Chart'
import RoleChangeSelect from '@/components/RoleChangeSelect'
import Spinner from '@/components/Spinner'
import { auditApi } from '@/services/api/analytics.api'
import { notificationsApi } from '@/services/api/notifications.api'
import { usersApi } from '@/services/api/users.api'
import { useLocale } from '@/hooks/useLocale'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { canManageRoles, canViewSecurity, decodeIdentityFromToken, hasOtherEffectiveSuperAdmin, isEffectiveSuperAdmin, canBanUser } from '@/utils/role'
import { extractErrorMessage } from '@/services/api/httpClient'
import { formatDateTime } from '@/utils/format'
import type { AdminActionLogDto } from '@/types/analytics'
import type { AdminUserDto, UserRole } from '@/types/auth'
import type { NotificationChannel, NotificationChannelSettingDto } from '@/types/notification'

type SettingsTab = 'channels' | 'roles' | 'security'

const channelLabels: Record<NotificationChannel, string> = {
  Discord: 'Discord webhook',
  Telegram: 'Telegram bot',
  Email: 'Email (SMTP)',
  Web: 'Web push',
}

// Chart data from photo reference
const sentPrimary: ChartPoint[] = [
  { timestamp: '2026-10-20T00:00:00Z', value: 12 },
  { timestamp: '2026-10-21T00:00:00Z', value: 18 },
  { timestamp: '2026-10-22T00:00:00Z', value: 25 },
  { timestamp: '2026-10-23T00:00:00Z', value: 31 },
  { timestamp: '2026-10-24T00:00:00Z', value: 22 },
  { timestamp: '2026-10-25T00:00:00Z', value: 16 },
]

const sentSecondary: ChartPoint[] = [
  { timestamp: '2026-10-20T00:00:00Z', value: 9 },
  { timestamp: '2026-10-21T00:00:00Z', value: 14 },
  { timestamp: '2026-10-22T00:00:00Z', value: 19 },
  { timestamp: '2026-10-23T00:00:00Z', value: 23 },
  { timestamp: '2026-10-24T00:00:00Z', value: 17 },
  { timestamp: '2026-10-25T00:00:00Z', value: 15 },
]

const errorsSeries: ChartPoint[] = [
  { timestamp: '2026-10-20T00:00:00Z', value: 1 },
  { timestamp: '2026-10-21T00:00:00Z', value: 0 },
  { timestamp: '2026-10-22T00:00:00Z', value: 2 },
  { timestamp: '2026-10-23T00:00:00Z', value: 1 },
  { timestamp: '2026-10-24T00:00:00Z', value: 0 },
  { timestamp: '2026-10-25T00:00:00Z', value: 0 },
]

const latencySeries: ChartPoint[] = [
  { timestamp: '2026-10-20T00:00:00Z', value: 170 },
  { timestamp: '2026-10-21T00:00:00Z', value: 192 },
  { timestamp: '2026-10-22T00:00:00Z', value: 210 },
  { timestamp: '2026-10-23T00:00:00Z', value: 188 },
  { timestamp: '2026-10-24T00:00:00Z', value: 176 },
  { timestamp: '2026-10-25T00:00:00Z', value: 184 },
]

export default function SettingsPage() {
  const { t } = useLocale()
  const rolePermissions: Array<{ role: UserRole; name: string; description: string; permissions: string[] }> = [
    { role: 'Admin', name: t.settings.roleAdmin, description: t.settings.roleAdminDesc, permissions: t.settings.roleAdminPerms },
    { role: 'Analyst', name: t.settings.roleAnalyst, description: t.settings.roleAnalystDesc, permissions: t.settings.roleAnalystPerms },
    { role: 'Moderator', name: t.settings.roleModerator, description: t.settings.roleModeratorDesc, permissions: t.settings.roleModeratorPerms },
    { role: 'SuperAdmin', name: t.settings.roleSuperAdmin, description: t.settings.roleSuperAdminDesc, permissions: t.settings.roleSuperAdminPerms },
  ]
  const role = useAuthStore((state) => state.role)
  const selfIdentity = decodeIdentityFromToken(useAuthStore((state) => state.accessToken))
  const showRolesTab = canManageRoles(role)
  const showSecurityTab = canViewSecurity(role)
  const [tab, setTab] = useState<SettingsTab>('channels')
  const [channels, setChannels] = useState<NotificationChannelSettingDto[]>([])
  const [users, setUsers] = useState<AdminUserDto[] | null>(null)
  const [auditLogs, setAuditLogs] = useState<AdminActionLogDto[]>([])
  const [loading, setLoading] = useState(true)

  const [editingChannel, setEditingChannel] = useState<NotificationChannelSettingDto | null>(null)
  const [channelForm, setChannelForm] = useState<{ webhookUrl: string; botToken: string; chatId: string; recipients: string }>({
    webhookUrl: '', botToken: '', chatId: '', recipients: '',
  })

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [channelData, usersData, auditData] = await Promise.all([
        notificationsApi.getChannels(),
        usersApi.getUsers().catch(() => null),
        auditApi.getLogs(1, 50).catch(() => ({ items: [], totalCount: 0 })),
      ])
      setChannels(channelData)
      setUsers(usersData)
      setAuditLogs(auditData.items)
    } catch (err) {
      console.warn('[SettingsPage] Не удалось загрузить данные', err)
      setChannels([])
      setUsers(null)
      setAuditLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const updateChannelStatus = async (channel: NotificationChannel, isEnabled: boolean, configJson: string | null) => {
    try {
      await notificationsApi.updateChannel(channel, isEnabled, configJson)
      toast.success(t.settings.channelUpdated)
      await reload()
    } catch { toast.error(t.settings.channelError) }
  }

  const handleOpenConfig = (ch: NotificationChannelSettingDto) => {
    setEditingChannel(ch)
    let parsed: Record<string, string> = {}
    if (ch.configJson) { try { parsed = JSON.parse(ch.configJson) as Record<string, string> } catch { parsed = {} } }
    setChannelForm({
      webhookUrl: parsed.webhookUrl ?? parsed.url ?? '',
      botToken: parsed.botToken ?? '',
      chatId: parsed.chatId ?? '',
      recipients: parsed.recipients ?? '',
    })
  }

  const handleSaveChannelConfig = async () => {
    if (!editingChannel) return
    if (editingChannel.channel === 'Discord' && channelForm.webhookUrl && !channelForm.webhookUrl.startsWith('https://')) {
      toast.warning(t.settings.webhookHttps); return
    }
    if (editingChannel.channel === 'Telegram' && channelForm.botToken && channelForm.botToken.includes(' ')) {
      toast.warning(t.settings.botTokenSpaces); return
    }
    const payload: Record<string, string> = {}
    if (editingChannel.channel === 'Discord') {
      if (channelForm.webhookUrl) payload.webhookUrl = channelForm.webhookUrl.trim()
    } else if (editingChannel.channel === 'Telegram') {
      if (channelForm.botToken) payload.botToken = channelForm.botToken.trim()
      if (channelForm.chatId) payload.chatId = channelForm.chatId.trim()
    } else if (editingChannel.channel === 'Email') {
      if (channelForm.recipients) payload.recipients = channelForm.recipients
    }
    const configJson = Object.keys(payload).length ? JSON.stringify(payload) : null
    await updateChannelStatus(editingChannel.channel, editingChannel.isEnabled, configJson)
    setEditingChannel(null)
  }

  const toggleBan = async (userId: string, isBanned: boolean) => {
    if (!isBanned) {
      const target = users?.find((item) => item.id === userId)
      if (target && isEffectiveSuperAdmin(target) && !hasOtherEffectiveSuperAdmin(users ?? [], userId)) {
        toast.error(t.settings.lastSuperAdmin); return
      }
    }
    try {
      await usersApi.toggleBan(userId)
      toast.success(isBanned ? t.settings.userUnbanned : t.settings.userBanned)
      await reload()
    } catch (err) { toast.error(extractErrorMessage(err)) }
  }

  if (loading) return <Spinner label={t.settings.loading} fullPage />

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 sm:gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{t.settings.title}</h1>
          <p className="mt-0.5 text-sm text-slate-400">{t.settings.subtitle}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-surface-700">
        {[
          { id: 'channels', label: t.settings.tabChannels },
          { id: 'roles', label: t.settings.tabRoles },
          { id: 'security', label: t.settings.tabSecurity },
        ]
          .filter((item) => item.id !== 'roles' || showRolesTab)
          .filter((item) => item.id !== 'security' || showSecurityTab)
          .map((item) => (
            <button key={item.id} onClick={() => setTab(item.id as SettingsTab)}
              className={`rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === item.id ? 'hud-tab-active border-primary-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              {item.label}
            </button>
          ))}
      </div>

      <div className="min-h-0 flex-1">
        <div className="flex flex-col gap-6">
          {/* ===== CHANNELS TAB — 1:1 layout from photo ===== */}
          {tab === 'channels' && (
            <>
              {/* Hero: Bot Health Score + Gauge + Info Card */}
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1.2fr]">
                {/* Left Hero: Health Score (like Biological Age) */}
                <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-br from-surface-900 via-surface-950 to-surface-900 p-6 shadow-2xl shadow-black/20">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Bot Gateway Health</div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="text-7xl font-black text-white leading-none tracking-tighter">99.8</span>
                    <span className="text-xl font-light text-slate-300">/ 100</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-300">
                    Average Uptime: <span className="font-bold text-success-400">99.91%</span>
                  </div>
                  <div className="mt-4 rounded-xl border border-surface-800 bg-surface-950/50 px-4 py-3 text-xs text-slate-400 leading-relaxed">
                    Gateway operating in normal mode. All bot instances connected to Telegram and Discord APIs. No critical errors detected in the last 24h.
                  </div>
                </div>

                {/* Middle: Circular Gauge (Percentile) */}
                <div className="flex flex-col items-center justify-center rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/80 to-surface-950/60 p-6 shadow-2xl shadow-black/20">
                  <div className="relative" style={{ width: 160, height: 160 }}>
                    <svg width="160" height="160" viewBox="0 0 160 160" className="rotate-[-90deg]">
                      <circle cx="80" cy="80" r="60" fill="none" stroke="#0f1115" strokeWidth="10" />
                      <circle cx="80" cy="80" r="60" fill="none" stroke="#38bdf8" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={377} strokeDashoffset={377 * (1 - 0.74)}
                        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.3))' }} />
                      <circle cx="80" cy="15" r="3" fill="#34d399" />
                      <circle cx="130" cy="80" r="3" fill="#f87171" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black text-white leading-none">74</span>
                      <span className="text-sm font-medium text-slate-400 tracking-wide">th</span>
                      <span className="text-xs text-slate-500">Percentile</span>
                      <span className="text-[10px] text-slate-600 mt-0.5">Your risk of failure</span>
                    </div>
                  </div>
                </div>

                {/* Right: Info Card (like Telomere length) */}
                <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/90 to-surface-950/60 p-6 shadow-2xl shadow-black/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Message Delivery</h3>
                    <span className="rounded-full border border-success-500/30 bg-success-500/10 px-2.5 py-0.5 text-[11px] font-medium text-success-400">Medium</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-black text-white">1,240</div>
                    <div className="text-xs text-slate-400">messages delivered in last 24h</div>
                  </div>
                  <div className="mt-4 rounded-xl border border-surface-800 bg-surface-950/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Success Rate</span>
                      <span className="font-bold text-white">99.2%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-800">
                      <div className="h-full w-[99%] rounded-full bg-gradient-to-r from-success-500 to-success-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Cards Row (like risk of disease cards) */}
              <div className="grid gap-4 lg:grid-cols-4">
                {/* API Latency */}
                <div className="rounded-2xl border border-surface-700/60 bg-gradient-to-b from-surface-900/80 to-surface-950/50 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white">API Latency</h4>
                    <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[11px] font-medium text-success-400 border border-success-500/30">Normal</span>
                  </div>
                  <div className="text-3xl font-black text-white">142 <span className="text-sm font-medium text-slate-400">ms</span></div>
                  <div className="text-xs text-slate-400">Average response time</div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
                    <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-success-500 to-emerald-400" />
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 leading-snug">Response time within acceptable range. Bots respond quickly to all webhook events.</p>
                </div>

                {/* Message Queue */}
                <div className="rounded-2xl border border-surface-700/60 bg-gradient-to-b from-surface-900/80 to-surface-950/50 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white">Message Queue</h4>
                    <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[11px] font-medium text-success-400 border border-success-500/30">Normal</span>
                  </div>
                  <div className="text-3xl font-black text-white">0</div>
                  <div className="text-xs text-slate-400">Pending messages</div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
                    <div className="h-full w-[5%] rounded-full bg-gradient-to-r from-success-500 to-emerald-400" />
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 leading-snug">No messages queued. Delivery pipeline operates at optimal capacity.</p>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-surface-800 bg-surface-950/30 px-3 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-400 animate-pulse" />
                    <span className="text-[11px] text-slate-400">Real-time monitoring active</span>
                  </div>
                </div>

                {/* Error Rate */}
                <div className="rounded-2xl border border-surface-700/60 bg-gradient-to-b from-surface-900/80 to-surface-950/50 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white">Error Rate</h4>
                    <span className="rounded-full bg-warning-500/10 px-2 py-0.5 text-[11px] font-medium text-warning-400 border border-warning-500/30">Suboptimal</span>
                  </div>
                  <div className="text-3xl font-black text-white">3 <span className="text-sm font-medium text-slate-400">errors</span></div>
                  <div className="text-xs text-slate-400">In last 24h</div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
                    <div className="h-full w-[15%] rounded-full bg-gradient-to-r from-warning-400 to-amber-400" />
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 leading-snug">Low error count. Occasional webhook timeouts detected. Monitor for patterns.</p>
                </div>

                {/* Gateway Health */}
                <div className="rounded-2xl border border-surface-700/60 bg-gradient-to-b from-surface-900/80 to-surface-950/50 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white">Gateway Health</h4>
                    <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[11px] font-medium text-success-400 border border-success-500/30">Normal</span>
                  </div>
                  <div className="text-3xl font-black text-white">99.8%</div>
                  <div className="text-xs text-slate-400">Overall uptime score</div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
                    <div className="h-full w-[99%] rounded-full bg-gradient-to-r from-success-500 via-emerald-400 to-success-400" />
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 leading-snug">Gateway performing within normal parameters. All health indicators green.</p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">📊 Отправленные сообщения по каналам</h3>
                    <span className="text-[10px] text-slate-500">24h trend</span>
                  </div>
                  <Chart data={sentPrimary} label="Telegram" color="#38bdf8" height={220} secondary={{ data: sentSecondary, label: 'Discord', color: '#a78bfa' }} />
                </div>
                <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">⚠️ Ошибки отправки</h3>
                    <span className="text-[10px] text-slate-500">24h errors</span>
                  </div>
                  <Chart data={errorsSeries} label="Ошибки" color="#f87171" height={220} />
                </div>
              </div>

              <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-5 shadow-xl shadow-black/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">⚡ Средняя задержка ответа (мс)</h3>
                  <span className="text-[10px] text-slate-500">Latency over time</span>
                </div>
                <Chart data={latencySeries} label="Задержка" color="#fbbf24" height={200} />
              </div>

              {/* Bot Instance Markers (like Epigenetic markers) */}
              <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-5 shadow-xl shadow-black/10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 animate-pulse" />
                  <h3 className="text-sm font-bold text-white">Экземпляры ботов</h3>
                  <span className="text-[10px] text-slate-500">(2 активных)</span>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { name: 'Telegram Bot (@SlushAlertBot)', provider: 'Telegram', ping: 142, sent: 1240, errors: 2, queue: 0, status: 'online' },
                    { name: 'Discord Bot (SlushAlertBot)', provider: 'Discord', ping: 198, sent: 890, errors: 5, queue: 1, status: 'online' },
                  ].map((bot) => (
                    <div key={bot.name} className="flex items-center gap-3 rounded-2xl border border-surface-800/60 bg-surface-950/30 px-4 py-3 transition-all hover:border-surface-700/40 hover:bg-surface-950/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-surface-800 to-surface-900 shadow-inner">
                        <span className="text-xs font-black text-white">{bot.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate">{bot.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Пинг: {bot.ping} мс · За 24ч: {bot.sent} · Ошибки: {bot.errors} · Очередь: {bot.queue}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${bot.status === 'online' ? 'bg-success-500/10 text-success-400 border border-success-500/30' : 'bg-danger-500/10 text-danger-400 border border-danger-500/30'}`}>
                          {bot.status === 'online' ? 'Normal' : 'Critical'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Events Table */}
              <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-5 shadow-xl shadow-black/10">
                <h3 className="mb-4 text-sm font-bold text-white">Последние события</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-surface-800/60">
                        <th className="pb-2 font-medium">Время</th>
                        <th className="pb-2 font-medium">Канал</th>
                        <th className="pb-2 font-medium">Событие</th>
                        <th className="pb-2 text-right font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {[
                        { time: '14:32', channel: 'Telegram', event: 'Алерт #42 отправлен', status: 'ok' },
                        { time: '14:28', channel: 'Discord', event: 'Тестовое сообщение', status: 'ok' },
                        { time: '14:15', channel: 'Telegram', event: 'Ошибка 403: chat not found', status: 'error' },
                        { time: '13:58', channel: 'Discord', event: 'Алерт #41 отправлен', status: 'ok' },
                        { time: '13:40', channel: 'Telegram', event: 'Алерт #40 отправлен', status: 'ok' },
                      ].map((event, i) => (
                        <tr key={i} className="border-t border-surface-800/30">
                          <td className="py-2.5 text-xs text-slate-400 font-mono">{event.time}</td>
                          <td className="py-2.5 font-medium text-slate-200">{event.channel}</td>
                          <td className="py-2.5 text-xs text-slate-300">{event.event}</td>
                          <td className="py-2.5 text-right">
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${event.status === 'ok' ? 'border-success-500/40 bg-success-500/10 text-success-400' : 'border-danger-500/40 bg-danger-500/10 text-danger-400'}`}>
                              {event.status === 'ok' ? 'OK' : 'Ошибка'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Channels Configuration */}
              <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-6 shadow-xl shadow-black/10">
                <div className="flex items-center gap-2 mb-5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600" />
                  <h3 className="text-base font-extrabold text-white">Каналы и конфигурация</h3>
                </div>
                <div className="flex flex-col gap-4">
                  {channels.map((channel) => {
                    let parsed: Record<string, string> = {}
                    try { parsed = channel.configJson ? JSON.parse(channel.configJson) : {} } catch { parsed = {} }
                    const summary = Object.entries(parsed).map(([k, v]) => `${k}: ${v ? '••••' : ''}`).join(' · ')
                    return (
                      <div key={channel.channel} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-surface-800/60 bg-surface-950/20 px-5 py-4 transition-all hover:border-surface-700/40 hover:bg-surface-950/40">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <button onClick={() => void updateChannelStatus(channel.channel, !channel.isEnabled, channel.configJson)}
                              className={`relative h-6 w-11 rounded-full transition-colors shadow-inner ${channel.isEnabled ? 'bg-success-500 shadow-success-500/20' : 'bg-surface-700'}`}
                              title={channel.isEnabled ? t.settings.disableTitle : t.settings.enableTitle}>
                              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${channel.isEnabled ? 'left-6 shadow-success-500/30' : 'left-0.5'}`} />
                            </button>
                            <span className="text-sm font-bold text-white tracking-wide">{channelLabels[channel.channel] ?? channel.channel}</span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${channel.isEnabled ? 'border-success-500/40 bg-success-500/10 text-success-400' : 'border-slate-700 text-slate-500'}`}>
                              {channel.isEnabled ? t.settings.enabledOn : t.settings.enabledOff}
                            </span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${summary ? 'border-success-500/30 bg-success-500/8 text-success-400' : 'border-warning-500/30 bg-warning-500/8 text-warning-400'}`}>
                              {summary ? '✓ Секреты сохранены' : '⚠ Требует настройки'}
                            </span>
                          </div>
                          <div className="mt-2 truncate text-xs text-slate-500 tracking-wide">{summary || t.settings.notConfigured}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { void notificationsApi.testChannel(channel.channel).then((res) => { if (res.ok) toast.success(res.message); else toast.error(res.message) }) }}
                            className="btn-ghost rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface-800 transition-colors">🧪 Тест</button>
                          <button onClick={() => handleOpenConfig(channel)} className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20 transition-all">{t.settings.configure}</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ===== ROLES TAB ===== */}
          {tab === 'roles' && showRolesTab && (
            <div className="flex flex-col gap-6">
              {users && (
                <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-6 shadow-xl shadow-black/10">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600" />
                    <h3 className="text-base font-extrabold text-white">{t.settings.networkUsers}</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(users ?? []).map((managedUser) => (
                      <div key={managedUser.id} className="flex items-center gap-4 rounded-2xl border border-surface-800/60 bg-surface-950/20 px-4 py-3 transition-all hover:border-surface-700/40 hover:bg-surface-950/40">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-extrabold text-white shadow-lg shadow-primary-500/20">
                          {managedUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 text-sm">
                          <div className="truncate font-bold text-slate-100 tracking-wide">{managedUser.username}</div>
                          <div className="text-[11px] text-slate-500 tracking-wide">{managedUser.email ?? t.settings.emailHidden} · Роль: <span className="font-semibold text-slate-300">{managedUser.role}</span></div>
                        </div>
                        <span className={`badge rounded-full border px-2.5 py-1 text-[11px] font-medium ${managedUser.isBanned ? 'border-danger-500/30 bg-danger-500/10 text-danger-400' : 'border-success-500/30 bg-success-500/10 text-success-400'}`}>
                          {managedUser.isBanned ? t.settings.banned : t.settings.active}
                        </span>
                        <RoleChangeSelect user={managedUser} users={users ?? []} onChanged={() => void reload()} />
                        <button onClick={() => void toggleBan(managedUser.id, managedUser.isBanned)}
                          disabled={!canBanUser(role, managedUser, selfIdentity)}
                          title={canBanUser(role, managedUser, selfIdentity) ? undefined : t.settings.banNotAllowed}
                          className={managedUser.isBanned ? 'btn-ghost rounded-xl h-9 px-3 text-xs font-semibold' : 'btn-danger rounded-xl h-9 px-3 text-xs font-semibold shadow-lg shadow-danger-500/10'}>
                          {managedUser.isBanned ? t.settings.unban : t.settings.ban}
                        </button>
                      </div>
                    ))}
                    {users?.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{t.settings.usersEmpty}</p>}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-6 shadow-xl shadow-black/10">
                <div className="flex items-center gap-2 mb-5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600" />
                  <h3 className="text-base font-extrabold text-white">{t.settings.rolesMatrix}</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {rolePermissions.map((rp) => (
                    <div key={rp.role} className="rounded-2xl border border-surface-800/60 bg-surface-950/30 p-5">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-white">{rp.name}</div>
                        <span className="badge rounded-full border border-surface-700 bg-surface-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">{rp.role}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed">{rp.description}</p>
                      <ul className="mt-4 flex flex-col gap-2 text-xs text-slate-300">
                        {rp.permissions.map((perm, idx) => (
                          <li key={idx} className="flex items-center gap-2.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 shadow shadow-primary-400/40" />
                            <span className="tracking-wide">{perm}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== SECURITY TAB ===== */}
          {tab === 'security' && showSecurityTab && (
            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-surface-700/60 bg-gradient-to-b from-surface-900/60 to-surface-950/40 p-6 shadow-xl shadow-black/10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600" />
                  <h3 className="text-base font-extrabold text-white">Журнал аудита действий администраторов</h3>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-surface-800/40">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-800/40">
                      <tr className="text-left text-xs text-slate-400">
                        <th className="pb-3 px-3 font-medium">Дата / Время</th>
                        <th className="pb-3 px-3 font-medium">Администратор</th>
                        <th className="pb-3 px-3 font-medium">Действие</th>
                        <th className="pb-3 px-3 font-medium">Детали</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800/30">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-800/20 transition-colors">
                          <td className="py-3 px-3 text-xs text-slate-400 font-mono">{formatDateTime(log.timestamp, locale)}</td>
                          <td className="py-3 px-3 font-medium text-white">{log.adminUsername ?? '—'}</td>
                          <td className="py-3 px-3">
                            <span className="rounded-md border border-primary-500/20 bg-primary-500/5 px-2.5 py-0.5 font-mono text-[11px] text-primary-300">{log.action}</span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-400">{log.details ?? '—'}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-500">Журнал аудита пуст</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for channel config */}
      <Modal open={editingChannel != null} title={t.settings.channelSetup(editingChannel ? (channelLabels[editingChannel.channel] ?? '') : '')} onClose={() => setEditingChannel(null)}>
        <div className="flex flex-col gap-4">
          {editingChannel?.channel === 'Discord' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Discord Webhook URL</label>
              <input type="text" value={channelForm.webhookUrl} onChange={(e) => setChannelForm({ ...channelForm, webhookUrl: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..." className="input w-full bg-surface-950 px-3 py-2 text-sm rounded-xl border border-surface-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/10 transition-all" />
              <p className="mt-1 text-[11px] text-slate-500">Укажите URL вебхука канала в Discord для отправки уведомлений</p>
            </div>
          )}
          {editingChannel?.channel === 'Telegram' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">{t.settings.botToken}</label>
                <input type="password" value={channelForm.botToken} onChange={(e) => setChannelForm({ ...channelForm, botToken: e.target.value })}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ" className="input w-full bg-surface-950 px-3 py-2 text-sm rounded-xl border border-surface-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/10 transition-all" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">{t.settings.chatId}</label>
                <input type="text" value={channelForm.chatId} onChange={(e) => setChannelForm({ ...channelForm, chatId: e.target.value })}
                  placeholder="-100123456789" className="input w-full bg-surface-950 px-3 py-2 text-sm rounded-xl border border-surface-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/10 transition-all" />
              </div>
            </>
          )}
          {editingChannel?.channel === 'Email' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">{t.settings.emailRecipients}</label>
              <input type="text" value={channelForm.recipients} onChange={(e) => setChannelForm({ ...channelForm, recipients: e.target.value })}
                placeholder="admin@example.com, user@example.com" className="input w-full bg-surface-950 px-3 py-2 text-sm rounded-xl border border-surface-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/10 transition-all" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { if (!editingChannel) return; void notificationsApi.testChannel(editingChannel.channel).then((res) => { if (res.ok) toast.success(res.message); else toast.error(res.message) }) }}
              className="btn-ghost rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-surface-800 transition-colors">🧪 Тест соединения</button>
            <button onClick={() => setEditingChannel(null)} className="btn-ghost rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-surface-800 transition-colors">{t.common.cancel}</button>
            <button onClick={() => void handleSaveChannelConfig()} className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20 transition-all">{t.common.save}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}