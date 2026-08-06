import { useCallback, useEffect, useState } from 'react'
import Spinner from '@/components/Spinner'
import { notificationsApi } from '@/services/api/notifications.api'
import { usersApi } from '@/services/api/users.api'
import { useAuthStore } from '@/store/authStore'
import type { PagedResult, UserDto, UserRole } from '@/types/auth'
import type { NotificationChannel, NotificationChannelSettingDto } from '@/types/notification'

const channelLabels: Record<NotificationChannel, string> = {
  Discord: 'Discord webhook',
  Telegram: 'Telegram bot',
  Email: 'Email (SMTP)',
  InApp: 'In-app (SignalR)',
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const isSuperAdmin = user?.role === 'SuperAdmin'
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Moderator'

  const [channels, setChannels] = useState<NotificationChannelSettingDto[]>([])
  const [users, setUsers] = useState<PagedResult<UserDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [channelData, usersData] = await Promise.all([
        isAdmin ? notificationsApi.getChannels() : Promise.resolve([]),
        isSuperAdmin ? usersApi.getUsers({ pageSize: 100 }) : Promise.resolve(null),
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

  const updateChannel = async (channel: NotificationChannel, isEnabled: boolean, configJson: string | null) => {
    setMessage(null)
    await notificationsApi.updateChannel(channel, isEnabled, configJson)
    setMessage('Настройки сохранены')
    await reload()
  }

  const updateRole = async (userId: number, role: UserRole) => {
    setMessage(null)
    await usersApi.updateRole(userId, role)
    setMessage('Роль обновлена')
    await reload()
  }

  const parseConfig = (configJson: string | null): Record<string, string> => {
    if (!configJson) {
      return {}
    }
    try {
      return JSON.parse(configJson) as Record<string, string>
    } catch {
      return {}
    }
  }

  if (loading) {
    return <Spinner />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">Настройки</h1>
        <p className="mt-0.5 text-sm text-slate-400">Каналы уведомлений и роли пользователей</p>
      </div>
      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-success-600/40 bg-success-500/10 px-3 py-2.5 text-sm text-success-400">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4L12 14.01l-3-3" />
          </svg>
          {message}
        </div>
      )}

      {isAdmin && (
        <section className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Каналы уведомлений</h3>
          <div className="flex flex-col gap-4">
            {channels.map((channel) => {
              const config = parseConfig(channel.configJson)
              return (
                <div key={channel.channel} className="flex items-center gap-4 border-b border-surface-700 pb-4 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void updateChannel(channel.channel, !channel.isEnabled, channel.configJson)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          channel.isEnabled ? 'bg-success-500 shadow-glow' : 'bg-surface-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                            channel.isEnabled ? 'left-4' : 'left-0.5'
                          }`}
                        />
                      </button>
                      <span className="text-sm font-medium text-slate-100">{channelLabels[channel.channel]}</span>
                      <span className={`text-xs ${channel.isEnabled ? 'text-success-400' : 'text-slate-500'}`}>
                        {channel.isEnabled ? 'включён' : 'выключен'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {Object.entries(config).map(([key, value]) => `${key}: ${value}`).join(' · ')}
                    </div>
                  </div>
                  {channel.channel !== 'InApp' && (
                    <button
                      onClick={() => {
                        const configJson = window.prompt(
                          'JSON-конфигурация канала (webhookUrl, botToken, chatId, recipients):',
                          channel.configJson ?? '{}',
                        )
                        if (configJson !== null) {
                          void updateChannel(channel.channel, channel.isEnabled, configJson)
                        }
                      }}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      Настроить
                    </button>
                  )}
                  <button
                    onClick={() => void notificationsApi.sendTest(channel.channel)}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    Тест
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {isSuperAdmin && users && (
        <section className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Управление ролями пользователей</h3>
          <div className="flex flex-col gap-2">
            {users.items.map((managedUser) => (
              <div key={managedUser.id} className="flex items-center gap-3 border-b border-surface-700 pb-2 last:border-0">
                <img src={managedUser.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full border border-surface-700" />
                <div className="flex-1 text-sm">
                  <div className="text-slate-100">{managedUser.username}</div>
                  <div className="text-xs text-slate-500">{managedUser.steamId64}</div>
                </div>
                <select
                  value={managedUser.role}
                  onChange={(event) => void updateRole(managedUser.id, event.target.value as UserRole)}
                  className="input bg-surface-950 px-2 py-1.5 text-sm"
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
        </section>
      )}

      <section className="card p-5 text-sm text-slate-400">
        <h3 className="mb-2 font-semibold text-slate-200">О проекте</h3>
        Дипломный проект «Админ-панель для Steam-клана»: ASP.NET Core 8 + React + TypeScript + PostgreSQL + Redis + Hangfire + SignalR.
        Steam API ключ настраивается в <code className="rounded bg-surface-800 px-1.5 py-0.5 text-slate-300">appsettings.json</code> (секция Steam.ApiKey).
      </section>
    </div>
  )
}