import { useCallback, useEffect, useMemo, useState } from 'react'
import { usersApi } from '@/services/api/users.api'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from '@/store/toastStore'
import { formatDateTime } from '@/utils/format'
import type { AdminUserDto } from '@/types/auth'

type StatusFilter = 'all' | 'active' | 'banned'

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'banned', label: 'Забаненные' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await usersApi.getUsers({ search: debouncedSearch || undefined }))
    } catch (err) {
      console.warn('[UsersPage] Не удалось загрузить пользователей', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    void reload()
  }, [reload])

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users
      .filter((user) => {
        if (statusFilter === 'active' && user.isBanned) return false
        if (statusFilter === 'banned' && !user.isBanned) return false
        if (!query) return true
        return (
          user.username.toLowerCase().includes(query) ||
          (user.email ?? '').toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => a.username.localeCompare(b.username, 'ru'))
  }, [users, search, statusFilter])

  const stats = useMemo(
    () => ({
      total: users.length,
      banned: users.filter((user) => user.isBanned).length,
    }),
    [users],
  )

  const toggleBan = async (user: AdminUserDto) => {
    setBusyId(user.id)
    try {
      await usersApi.toggleBan(user.id)
      toast.success(user.isBanned ? `${user.username} разбанен` : `${user.username} забанен`)
      await reload()
    } catch {
      toast.error('Не удалось изменить статус блокировки')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-white">Пользователи сети</h1>
          <p className="hidden sm:block mt-0.5 text-xs sm:text-sm text-slate-400">
            Все зарегистрированные пользователи: поиск, фильтр по статусу, блокировка
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border border-surface-700 bg-surface-900 px-3 py-1 text-slate-300">
            Всего: <strong className="text-white">{stats.total}</strong>
          </span>
          <span className="rounded-full border border-danger-500/40 bg-danger-500/10 px-3 py-1 text-danger-400">
            Забанено: <strong>{stats.banned}</strong>
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по имени, email или роли..."
          className="input h-10 flex-1 bg-surface-950"
        />
        <div className="flex gap-1 rounded-lg border border-surface-700 bg-surface-900 p-0.5">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === filter.key
                  ? 'bg-primary-500 font-semibold text-surface-950 shadow-glow'
                  : 'text-slate-400 hover:bg-surface-800'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card card-hud p-8 text-center text-sm text-slate-400">Загрузка пользователей...</div>
      ) : visibleUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-700 px-4 py-12 text-center text-sm text-slate-500">
          Пользователи не найдены
        </div>
      ) : (
        <div className="card card-hud overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/60 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Пользователь</th>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3 hidden md:table-cell">Регистрация</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} className="border-b border-surface-800/60 transition-colors last:border-0 hover:bg-surface-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-100">{user.username}</div>
                          <div className="truncate text-xs text-slate-500">{user.email ?? 'email скрыт'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge border border-surface-700 bg-surface-800 text-slate-300">{user.role}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge border px-2 py-0.5 text-[11px] ${
                          user.isBanned
                            ? 'border-danger-500/40 bg-danger-500/10 text-danger-400'
                            : 'border-success-500/40 bg-success-500/10 text-success-400'
                        }`}
                      >
                        {user.isBanned ? 'Забанен' : 'Активен'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void toggleBan(user)}
                        disabled={busyId === user.id}
                        className={user.isBanned ? 'btn-ghost h-8 px-3 text-xs' : 'btn-danger h-8 px-3 text-xs'}
                      >
                        {busyId === user.id ? '...' : user.isBanned ? 'Разбанить' : 'Забанить'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
