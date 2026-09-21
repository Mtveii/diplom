import { useCallback, useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import RoleChangeSelect from '@/components/RoleChangeSelect'
import Spinner from '@/components/Spinner'
import { auditApi } from '@/services/api/analytics.api'
import { notificationsApi } from '@/services/api/notifications.api'
import { usersApi } from '@/services/api/users.api'
import { useLocale } from '@/hooks/useLocale'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { canManageRoles, canViewSecurity, hasOtherEffectiveSuperAdmin, isEffectiveSuperAdmin } from '@/utils/role'
import { formatDateTime } from '@/utils/format'
import type { AdminActionLogDto } from '@/types/analytics'
import type { AdminUserDto, UserRole } from '@/types/auth'
import type { NotificationChannel, NotificationChannelSettingDto } from '@/types/notification'

type SettingsTab = 'channels' | 'roles' | 'security' | 'about'

const channelLabels: Record<NotificationChannel, string> = {
  Discord: 'Discord webhook',
  Telegram: 'Telegram bot',
  Email: 'Email (SMTP)',
  InApp: 'In-app (SignalR)',
}

export default function SettingsPage() {
  const { t, locale } = useLocale()
  const rolePermissions: Array<{ role: UserRole; name: string; description: string; permissions: string[] }> = [
    {
      role: 'Admin',
      name: t.settings.roleAdmin,
      description: t.settings.roleAdminDesc,
      permissions: t.settings.roleAdminPerms,
    },
    {
      role: 'Analyst',
      name: t.settings.roleAnalyst,
      description: t.settings.roleAnalystDesc,
      permissions: t.settings.roleAnalystPerms,
    },
    {
      role: 'Moderator',
      name: t.settings.roleModerator,
      description: t.settings.roleModeratorDesc,
      permissions: t.settings.roleModeratorPerms,
    },
    {
      role: 'SuperAdmin',
      name: t.settings.roleSuperAdmin,
      description: t.settings.roleSuperAdminDesc,
      permissions: t.settings.roleSuperAdminPerms,
    },
  ]
  const role = useAuthStore((state) => state.role)
  /** Смена ролей — только SuperAdmin; аудит/безопасность — SuperAdmin и Admin. */
  const showRolesTab = canManageRoles(role)
  const showSecurityTab = canViewSecurity(role)
  const [tab, setTab] = useState<SettingsTab>('channels')
  const [channels, setChannels] = useState<NotificationChannelSettingDto[]>([])
  const [users, setUsers] = useState<AdminUserDto[] | null>(null)
  const [auditLogs, setAuditLogs] = useState<AdminActionLogDto[]>([])
  const [loading, setLoading] = useState(true)

  const [editingChannel, setEditingChannel] = useState<NotificationChannelSettingDto | null>(null)
  const [channelForm, setChannelForm] = useState<{ webhookUrl: string; botToken: string; chatId: string; recipients: string }>({
    webhookUrl: '',
    botToken: '',
    chatId: '',
    recipients: '',
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
      console.warn('[SettingsPage] Не удалось загрузить настройки — показываю пустые данные', err)
      setChannels([])
      setUsers(null)
      setAuditLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const updateChannelStatus = async (channel: NotificationChannel, isEnabled: boolean, configJson: string | null) => {
    try {
      await notificationsApi.updateChannel(channel, isEnabled, configJson)
      toast.success(t.settings.channelUpdated)
      await reload()
    } catch {
      toast.error(t.settings.channelError)
    }
  }

  const handleOpenConfig = (ch: NotificationChannelSettingDto) => {
    setEditingChannel(ch)
    let parsed: Record<string, string> = {}
    if (ch.configJson) {
      try {
        parsed = JSON.parse(ch.configJson) as Record<string, string>
      } catch {
        parsed = {}
      }
    }
    setChannelForm({
      webhookUrl: parsed.webhookUrl ?? parsed.url ?? '',
      botToken: parsed.botToken ?? '',
      chatId: parsed.chatId ?? '',
      recipients: parsed.recipients ?? '',
    })
  }

  const handleSaveChannelConfig = async () => {
    if (!editingChannel) return
    // Базовая валидация перед отправкой секретов
    if (editingChannel.channel === 'Discord' && channelForm.webhookUrl && !channelForm.webhookUrl.startsWith('https://')) {
      toast.warning(t.settings.webhookHttps)
      return
    }
    if (editingChannel.channel === 'Telegram' && channelForm.botToken && channelForm.botToken.includes(' ')) {
      toast.warning(t.settings.botTokenSpaces)
      return
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
    // Последнего действующего суперадмина банить нельзя — иначе некому управлять ролями.
    if (!isBanned) {
      const target = users?.find((item) => item.id === userId)
      if (target && isEffectiveSuperAdmin(target) && !hasOtherEffectiveSuperAdmin(users ?? [], userId)) {
        toast.error(t.settings.lastSuperAdmin)
        return
      }
    }
    try {
      await usersApi.toggleBan(userId)
      toast.success(isBanned ? t.settings.userUnbanned : t.settings.userBanned)
      await reload()
    } catch {
      toast.error(t.settings.banError)
    }
  }

  if (loading) {
    return <Spinner label={t.settings.loading} fullPage />
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{t.settings.title}</h1>
          <p className="mt-0.5 text-sm text-slate-400">{t.settings.subtitle}</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-surface-700">
        {(
          [
            { id: 'channels', label: t.settings.tabChannels },
            { id: 'roles', label: t.settings.tabRoles },
            { id: 'security', label: t.settings.tabSecurity },
            { id: 'about', label: t.settings.tabAbout },
          ] as const
        )
          .filter((item) => item.id !== 'roles' || showRolesTab)
          .filter((item) => item.id !== 'security' || showSecurityTab)
          .map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'hud-tab-active border-primary-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <div className="flex flex-col gap-6">
          {tab === 'channels' && (
            <div className="card card-hud p-5">
              <div className="card-header-hud mb-4">
                <h3 className="card-header-hud__title">{t.settings.channelsTitle}</h3>
              </div>
              <div className="flex flex-col gap-4">
                  {channels.map((channel) => {
                    let parsed: Record<string, string> = {}
                    try {
                      parsed = channel.configJson ? JSON.parse(channel.configJson) : {}
                    } catch {
                      parsed = {}
                    }
                    const summary = Object.entries(parsed)
                      .map(([k, v]) => `${k}: ${v ? '••••' : ''}`)
                      .join(' · ')

                    return (
                      <div key={channel.channel} className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-700/60 pb-4 last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => void updateChannelStatus(channel.channel, !channel.isEnabled, channel.configJson)}
                              className={`relative h-5 w-9 rounded-full transition-colors ${
                                channel.isEnabled ? 'bg-success-500 shadow-glow' : 'bg-surface-700'
                              }`}
                              title={channel.isEnabled ? t.settings.disableTitle : t.settings.enableTitle}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                                  channel.isEnabled ? 'left-4' : 'left-0.5'
                                }`}
                              />
                            </button>
                            <span className="text-sm font-medium text-slate-100">{channelLabels[channel.channel]}</span>
                            <span className={`text-xs font-medium ${channel.isEnabled ? 'text-success-400' : 'text-slate-500'}`}>
                              {channel.isEnabled ? t.settings.enabledOn : t.settings.enabledOff}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">{summary || t.settings.notConfigured}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {channel.channel !== 'InApp' && (
                            <button onClick={() => handleOpenConfig(channel)} className="btn-ghost px-3 py-1.5 text-xs">
                              {t.settings.configure}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
            </div>
          )}

          {tab === 'roles' && showRolesTab && (
            <div className="flex flex-col gap-6">
              {users && (
                  <div className="card card-hud p-5">
                    <div className="card-header-hud mb-4">
                      <h3 className="card-header-hud__title">{t.settings.networkUsers}</h3>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {(users ?? []).map((managedUser) => (
                        <div key={managedUser.id} className="flex items-center gap-3 border-b border-surface-700/60 pb-3 last:border-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
                            {managedUser.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1 text-sm">
                            <div className="truncate font-medium text-slate-100">{managedUser.username}</div>
                            <div className="text-xs text-slate-500">{managedUser.email ?? t.settings.emailHidden} · {managedUser.role}</div>
                          </div>
                          <span className={`badge border px-2 py-0.5 text-[11px] ${managedUser.isBanned ? 'border-danger-500/40 bg-danger-500/10 text-danger-400' : 'border-success-500/40 bg-success-500/10 text-success-400'}`}>
                            {managedUser.isBanned ? t.settings.banned : t.settings.active}
                          </span>
                          <RoleChangeSelect
                            user={managedUser}
                            users={users ?? []}
                            onChanged={() => void reload()}
                          />
                          <button
                            onClick={() => void toggleBan(managedUser.id, managedUser.isBanned)}
                            className={managedUser.isBanned ? 'btn-ghost h-8 px-3 text-xs' : 'btn-danger h-8 px-3 text-xs'}
                          >
                            {managedUser.isBanned ? t.settings.unban : t.settings.ban}
                          </button>
                        </div>
                      ))}
                      {users?.length === 0 && (
                        <p className="py-4 text-center text-sm text-slate-500">{t.settings.usersEmpty}</p>
                      )}
                    </div>
                  </div>
              )}

              <div className="card card-hud p-5">
                <div className="card-header-hud mb-4">
                  <h3 className="card-header-hud__title">{t.settings.rolesMatrix}</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {rolePermissions.map((rp) => (
                    <div key={rp.role} className="rounded-xl border border-surface-700/60 bg-surface-800/40 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-white">{rp.name}</div>
                        <span className="badge border border-surface-700 bg-surface-800 text-slate-300">{rp.role}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{rp.description}</p>
                      <ul className="mt-3 flex flex-col gap-1.5 text-xs text-slate-300">
                        {rp.permissions.map((perm, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                            {perm}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'security' && showSecurityTab && (
            <div className="flex flex-col gap-6">
            <div className="card card-hud p-5">
              <div className="card-header-hud mb-4">
                  <h3 className="card-header-hud__title">{t.settings.securityTitle}</h3>
              </div>
              <p className="mb-4 text-xs text-slate-400">
                {t.settings.securityDesc}
              </p>
              {users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400">
                        <th className="pb-2">{t.settings.colUser}</th>
                        <th className="pb-2">{t.settings.colRole}</th>
                        <th className="pb-2">{t.settings.colRegistered}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-surface-700/60">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-[11px] font-bold text-white">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-100">{u.username}</span>
                            </div>
                          </td>
                          <td className="py-2.5">
                            <span className="badge border border-surface-700 bg-surface-800 text-slate-300">{u.role}</span>
                          </td>
                          <td className="py-2.5 text-xs text-slate-400">{formatDateTime(u.createdAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-slate-500">{t.settings.securityEmpty}</div>
              )}
            </div>
            <div className="card card-hud p-5">
              <div className="card-header-hud mb-4">
                <h3 className="card-header-hud__title">{t.settings.auditTitle}</h3>
              </div>
              {auditLogs.length === 0 ? (
                <div className="text-sm text-slate-500">{t.settings.auditEmpty}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400">
                        <th className="pb-2">{t.settings.colUser}</th>
                        <th className="pb-2">{t.settings.auditAction}</th>
                        <th className="pb-2">{t.settings.auditEntity}</th>
                        <th className="pb-2 text-right">{t.settings.auditTime}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-t border-surface-700/60">
                          <td className="max-w-32 truncate py-2.5 font-medium text-slate-100">{log.adminUsername ?? '—'}</td>
                          <td className="max-w-48 truncate py-2.5 text-xs">{log.action ?? '—'}</td>
                          <td className="max-w-48 truncate py-2.5 text-xs text-slate-400">
                            {[log.entityName, log.entityId].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="py-2.5 text-right text-xs text-slate-400">{formatDateTime(log.timestamp, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="card card-hud p-5">
              <div className="card-header-hud mb-3">
                <h3 className="card-header-hud__title">{t.settings.aboutTitle}</h3>
              </div>
              <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
                <p>
                  <strong className="text-white">{t.settings.aboutLead}</strong> {t.settings.aboutText}
                </p>
                <div className="tech-badges pt-2">
                  {['ASP.NET Core 8', 'PostgreSQL', 'SignalR', 'React 18', 'Recharts', 'Zustand'].map(t => (
                    <span key={t} className="tech-badge">{t}</span>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div className="card card-hud card-hud--sm p-3.5 text-xs">
                    <div className="font-semibold text-white mb-1">{t.settings.backendStack}</div>
                    <ul className="flex flex-col gap-1 text-slate-400">
                      {t.settings.backendItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="card card-hud card-hud--sm p-3.5 text-xs">
                    <div className="font-semibold text-white mb-1">{t.settings.frontendStack}</div>
                    <ul className="flex flex-col gap-1 text-slate-400">
                      {t.settings.frontendItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={editingChannel != null}
        title={t.settings.channelSetup(editingChannel ? channelLabels[editingChannel.channel] : '')}
        onClose={() => setEditingChannel(null)}
      >
        <div className="flex flex-col gap-4">
          {editingChannel?.channel === 'Discord' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Discord Webhook URL</label>
              <input
                type="text"
                value={channelForm.webhookUrl}
                onChange={(e) => setChannelForm({ ...channelForm, webhookUrl: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
                className="input w-full bg-surface-950 px-3 py-2 text-sm"
              />
            </div>
          )}
          {editingChannel?.channel === 'Telegram' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Telegram Bot Token</label>
                <input
                  type="text"
                  value={channelForm.botToken}
                  onChange={(e) => setChannelForm({ ...channelForm, botToken: e.target.value })}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="input w-full bg-surface-950 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t.settings.tokenHint}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Telegram Chat ID</label>
                <input
                  type="text"
                  value={channelForm.chatId}
                  onChange={(e) => setChannelForm({ ...channelForm, chatId: e.target.value })}
                  placeholder="-100123456789"
                  className="input w-full bg-surface-950 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t.settings.chatHint}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  <code className="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-slate-300">
                    api.telegram.org/bot{'<TOKEN>'}/getUpdates
                  </code>
                </p>
              </div>
            </>
          )}
          {editingChannel?.channel === 'Email' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">{t.settings.emailRecipients}</label>
              <input
                type="text"
                value={channelForm.recipients}
                onChange={(e) => setChannelForm({ ...channelForm, recipients: e.target.value })}
                placeholder="admin@example.com, user@example.com"
                className="input w-full bg-surface-950 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditingChannel(null)} className="btn-ghost px-4 py-2 text-sm">
              {t.common.cancel}
            </button>
            <button onClick={() => void handleSaveChannelConfig()} className="btn-primary px-4 py-2 text-sm">
              {t.common.save}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
