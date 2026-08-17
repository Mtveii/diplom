import { useCallback, useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import Spinner from '@/components/Spinner'
import { notificationsApi } from '@/services/api/notifications.api'
import { usersApi } from '@/services/api/users.api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { formatDateTime } from '@/utils/format'
import type { PagedResult, UserDto, UserRole } from '@/types/auth'
import type { NotificationChannel, NotificationChannelSettingDto } from '@/types/notification'

type SettingsTab = 'channels' | 'roles' | 'security' | 'about'

const channelLabels: Record<NotificationChannel, string> = {
  Discord: 'Discord webhook',
  Telegram: 'Telegram bot',
  Email: 'Email (SMTP)',
  InApp: 'In-app (SignalR)',
}

const rolePermissions: Array<{ role: UserRole; name: string; description: string; permissions: string[] }> = [
  {
    role: 'Viewer',
    name: 'Наблюдатель',
    description: 'Базовый доступ для просмотра данных клана',
    permissions: ['Просмотр дашборда', 'Просмотр каталога игр и мониторинга', 'Просмотр списка участников'],
  },
  {
    role: 'Analyst',
    name: 'Аналитик',
    description: 'Доступ к отчетам и аналитике',
    permissions: ['Всё, что Viewer', 'Просмотр аналитики и когорт', 'Экспорт отчетов (PDF/Excel)'],
  },
  {
    role: 'Moderator',
    name: 'Модератор',
    description: 'Управление участниками и заявками',
    permissions: ['Всё, что Analyst', 'Управление заявками на вступление', 'Модерация участников (статусы, варны, роли)'],
  },
  {
    role: 'SuperAdmin',
    name: 'Суперлидер',
    description: 'Полный доступ ко всем настройкам системы',
    permissions: ['Всё, что Moderator', 'Настройка каналов уведомлений', 'Управление ролями пользователей', 'Системные настройки'],
  },
]

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const isSuperAdmin = user?.role === 'SuperAdmin'
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Moderator'

  const [tab, setTab] = useState<SettingsTab>('channels')
  const [channels, setChannels] = useState<NotificationChannelSettingDto[]>([])
  const [users, setUsers] = useState<PagedResult<UserDto> | null>(null)
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
      const [channelData, usersData] = await Promise.all([
        isAdmin ? notificationsApi.getChannels() : Promise.resolve([]),
        isSuperAdmin || isAdmin ? usersApi.getUsers({ pageSize: 100 }) : Promise.resolve(null),
      ])
      setChannels(channelData)
      setUsers(usersData)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isSuperAdmin])

  useEffect(() => {
    void reload()
  }, [reload])

  const updateChannelStatus = async (channel: NotificationChannel, isEnabled: boolean, configJson: string | null) => {
    try {
      await notificationsApi.updateChannel(channel, isEnabled, configJson)
      toast.success('Настройки канала обновлены')
      await reload()
    } catch {
      toast.error('Не удалось обновить канал')
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
    const payload: Record<string, string> = {}
    if (editingChannel.channel === 'Discord') {
      payload.webhookUrl = channelForm.webhookUrl
    } else if (editingChannel.channel === 'Telegram') {
      payload.botToken = channelForm.botToken
      payload.chatId = channelForm.chatId
    } else if (editingChannel.channel === 'Email') {
      payload.recipients = channelForm.recipients
    }
    const configJson = JSON.stringify(payload)
    await updateChannelStatus(editingChannel.channel, editingChannel.isEnabled, configJson)
    setEditingChannel(null)
  }

  const updateRole = async (userId: number, role: UserRole) => {
    try {
      await usersApi.updateRole(userId, role)
      toast.success('Роль пользователя обновлена')
      await reload()
    } catch {
      toast.error('Не удалось изменить роль')
    }
  }

  if (loading) {
    return <Spinner label="Загрузка настроек..." fullPage />
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Настройки системы</h1>
          <p className="mt-0.5 text-sm text-slate-400">Каналы уведомлений, роли, безопасность и информация о проекте</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-surface-700">
        {(
          [
            { id: 'channels', label: 'Каналы уведомлений' },
            { id: 'roles', label: 'Роли и права' },
            { id: 'security', label: 'Безопасность и сессии' },
            { id: 'about', label: 'О проекте' },
          ] as const
        ).map((t) => (
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
                <h3 className="card-header-hud__title">Каналы уведомлений и вебхуки</h3>
              </div>
              {!isAdmin ? (
                <div className="text-sm text-slate-500">У вас нет прав для настройки каналов уведомлений</div>
              ) : (
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
                              title={channel.isEnabled ? 'Отключить' : 'Включить'}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                                  channel.isEnabled ? 'left-4' : 'left-0.5'
                                }`}
                              />
                            </button>
                            <span className="text-sm font-medium text-slate-100">{channelLabels[channel.channel]}</span>
                            <span className={`text-xs font-medium ${channel.isEnabled ? 'text-success-400' : 'text-slate-500'}`}>
                              {channel.isEnabled ? 'включен' : 'выключен'}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">{summary || 'Конфигурация не задана'}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {channel.channel !== 'InApp' && (
                            <button onClick={() => handleOpenConfig(channel)} className="btn-ghost px-3 py-1.5 text-xs">
                              Настроить
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                await notificationsApi.sendTest(channel.channel)
                                toast.success(`Тестовое уведомление отправлено в ${channel.channel}`)
                              } catch {
                                toast.error('Не удалось отправить тестовое уведомление')
                              }
                            }}
                            className="btn-ghost px-3 py-1.5 text-xs"
                          >
                            Тест
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'roles' && (
            <div className="flex flex-col gap-6">
              {isSuperAdmin && users && (
                <div className="card card-hud p-5">
                  <div className="card-header-hud mb-4">
                    <h3 className="card-header-hud__title">Управление ролями пользователей</h3>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {users.items.map((managedUser) => (
                      <div key={managedUser.id} className="flex items-center gap-3 border-b border-surface-700/60 pb-3 last:border-0">
                        <img src={managedUser.avatarUrl} alt="avatar" className="h-9 w-9 rounded-full border border-surface-700 object-cover" />
                        <div className="min-w-0 flex-1 text-sm">
                          <div className="truncate font-medium text-slate-100">{managedUser.username}</div>
                          <div className="text-xs text-slate-500">SteamID: {managedUser.steamId64}</div>
                        </div>
                        <select
                          value={managedUser.role}
                          onChange={(event) => void updateRole(managedUser.id, event.target.value as UserRole)}
                          className="input bg-surface-950 px-3 py-1.5 text-xs"
                        >
                          {(['Viewer', 'Analyst', 'Moderator', 'SuperAdmin'] as UserRole[]).map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card card-hud p-5">
                <div className="card-header-hud mb-4">
                  <h3 className="card-header-hud__title">Матрица ролей и полномочий</h3>
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

          {tab === 'security' && (
            <div className="card card-hud p-5">
              <div className="card-header-hud mb-4">
                <h3 className="card-header-hud__title">Безопасность и сессии пользователей</h3>
              </div>
              <p className="mb-4 text-xs text-slate-400">
                Журнал активности аутентификации и активные пользователи системы
              </p>
              {users && users.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400">
                        <th className="pb-2">Пользователь</th>
                        <th className="pb-2">Роль</th>
                        <th className="pb-2">Регистрация</th>
                        <th className="pb-2">Последний вход</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {users.items.map((u) => (
                        <tr key={u.id} className="border-t border-surface-700/60">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                              <span className="font-medium text-slate-100">{u.username}</span>
                            </div>
                          </td>
                          <td className="py-2.5">
                            <span className="badge border border-surface-700 bg-surface-800 text-slate-300">{u.role}</span>
                          </td>
                          <td className="py-2.5 text-xs text-slate-400">{formatDateTime(u.createdAt)}</td>
                          <td className="py-2.5 text-xs text-slate-400">{formatDateTime(u.lastLoginAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Нет данных о пользователях</div>
              )}
            </div>
          )}

          {tab === 'about' && (
            <div className="card card-hud p-5">
              <div className="card-header-hud mb-3">
                <h3 className="card-header-hud__title">О проектной системе</h3>
              </div>
              <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
                <p>
                  <strong className="text-white">Админ-панель Steam-клана</strong> — дипломный программный комплекс для
                  автоматизации мониторинга состава клана, игровой активности участников, цен игр в Steam/GOG/Epic/F2G, а также
                  управления заявками и алертами в реальном времени.
                </p>
                <div className="tech-badges pt-2">
                  {['ASP.NET Core 8', 'PostgreSQL', 'SignalR', 'React 18', 'Recharts', 'Zustand'].map(t => (
                    <span key={t} className="tech-badge">{t}</span>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div className="card card-hud card-hud--sm p-3.5 text-xs">
                    <div className="font-semibold text-white mb-1">Backend стек</div>
                    <ul className="flex flex-col gap-1 text-slate-400">
                      <li>· ASP.NET Core 8 Web API (Clean Architecture)</li>
                      <li>· Entity Framework Core + PostgreSQL</li>
                      <li>· Hangfire (фоновые задачи синховки)</li>
                      <li>· SignalR (real-time события)</li>
                      <li>· QuestPDF & ClosedXML (экспорт отчетов)</li>
                    </ul>
                  </div>
                  <div className="card card-hud card-hud--sm p-3.5 text-xs">
                    <div className="font-semibold text-white mb-1">Frontend стек</div>
                    <ul className="flex flex-col gap-1 text-slate-400">
                      <li>· React 18 + TypeScript + Vite</li>
                      <li>· Tailwind CSS + Custom Dark Theme</li>
                      <li>· Recharts (графики активности и цен)</li>
                      <li>· Zustand (состояние и тосты)</li>
                      <li>· TanStack Virtual (виртуализация каталога)</li>
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
        title={`Настройка канала: ${editingChannel ? channelLabels[editingChannel.channel] : ''}`}
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
              </div>
            </>
          )}
          {editingChannel?.channel === 'Email' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Email получателей (через запятую)</label>
              <input
                type="text"
                value={channelForm.recipients}
                onChange={(e) => setChannelForm({ ...channelForm, recipients: e.target.value })}
                placeholder="admin@example.com, clan@example.com"
                className="input w-full bg-surface-950 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditingChannel(null)} className="btn-ghost px-4 py-2 text-sm">
              Отмена
            </button>
            <button onClick={() => void handleSaveChannelConfig()} className="btn-primary px-4 py-2 text-sm">
              Сохранить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
