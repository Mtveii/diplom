import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DonutChart from '@/components/DonutChart'
import { usersApi } from '@/services/api/users.api'
import { useDebounce } from '@/hooks/useDebounce'
import { useLocale } from '@/hooks/useLocale'
import RoleChangeSelect from '@/components/RoleChangeSelect'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { downloadCsv } from '@/utils/csv'
import { formatDateTime } from '@/utils/format'
import {
  canBanUser,
  canManageRoles,
  decodeIdentityFromToken,
  hasOtherEffectiveSuperAdmin,
  isEffectiveSuperAdmin,
} from '@/utils/role'
import { extractErrorMessage } from '@/services/api/httpClient'
import type { AdminUserDto } from '@/types/auth'

type StatusFilter = 'all' | 'active' | 'banned'
type SortKey = 'username' | 'role' | 'createdAt' | 'status'

const PAGE_SIZE = 20

/** Цвет бейджа роли: SuperAdmin сразу видно в списке. */
const ROLE_BADGE_CLASS: Record<string, string> = {
  SuperAdmin: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  Admin: 'border-primary-500/40 bg-primary-500/10 text-primary-300',
  Moderator: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  Analyst: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
}

const roleBadgeClass = (role: string): string =>
  ROLE_BADGE_CLASS[role] ?? 'border-surface-700 bg-surface-800 text-slate-300'

export default function UsersPage() {
  const { t, locale, compareLocale } = useLocale()
  const navigate = useNavigate()
  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t.users.filterAll },
    { key: 'active', label: t.users.filterActive },
    { key: 'banned', label: t.users.filterBanned },
  ]
  const [users, setUsers] = useState<AdminUserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('username')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  /** Смена ролей — только SuperAdmin. */
  const canChangeRoles = canManageRoles(useAuthStore((state) => state.role))
  const currentRole = useAuthStore((state) => state.role)
  const selfIdentity = decodeIdentityFromToken(useAuthStore((state) => state.accessToken))

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

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const dir = sortDir === 'asc' ? 1 : -1
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
      .sort((a, b) => {
        switch (sortKey) {
          case 'role':
            return a.role.localeCompare(b.role, compareLocale) * dir
          case 'createdAt':
            return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
          case 'status':
            return (Number(a.isBanned) - Number(b.isBanned)) * dir
          default:
            return a.username.localeCompare(b.username, compareLocale) * dir
        }
      })
  }, [users, search, statusFilter, compareLocale, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedUsers = visibleUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const rangeFrom = visibleUsers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeTo = Math.min(safePage * PAGE_SIZE, visibleUsers.length)

  const stats = useMemo(
    () => ({
      total: users.length,
      banned: users.filter((user) => user.isBanned).length,
    }),
    [users],
  )

  const exportCsv = () => {
    downloadCsv(
      'users.csv',
      [t.users.colUser, 'Email', t.users.colRole, t.users.colRegistered, t.users.colStatus],
      visibleUsers.map((user) => [
        user.username,
        user.email ?? '',
        user.role,
        formatDateTime(user.createdAt, locale),
        user.isBanned ? t.users.banned : t.users.active,
      ]),
    )
  }

  const toggleBan = async (user: AdminUserDto) => {
    // Последнего действующего суперадмина банить нельзя — иначе некому управлять ролями.
    if (!user.isBanned && isEffectiveSuperAdmin(user) && !hasOtherEffectiveSuperAdmin(users, user.id)) {
      toast.error(t.users.lastSuperAdmin)
      return
    }
    setBusyId(user.id)
    try {
      await usersApi.toggleBan(user.id)
      toast.success(t.users.banToast(user.username, user.isBanned))
      await reload()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-white">{t.users.title}</h1>
          <p className="hidden sm:block mt-0.5 text-xs sm:text-sm text-slate-400">
            {t.users.subtitle}
          </p>
        </div>
        <div className="card card-hud px-4 py-3">
          <DonutChart
            data={[
              { name: t.users.active, value: stats.total - stats.banned, color: '#34d399' },
              { name: t.users.banned, value: stats.banned, color: '#f87171' },
            ]}
            size={104}
            centerValue={stats.total}
            centerLabel={t.users.total}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t.users.searchPh}
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
        <button
          onClick={exportCsv}
          disabled={visibleUsers.length === 0}
          className="btn-ghost h-10 shrink-0 px-4 text-xs disabled:opacity-40"
        >
          {t.users.exportCsv}
        </button>
      </div>

      {loading ? (
        <div className="card card-hud p-8 text-center text-sm text-slate-400">{t.users.loading}</div>
      ) : visibleUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-700 px-4 py-12 text-center text-sm text-slate-500">
          {t.users.empty}
        </div>
      ) : (
        <div className="card card-hud overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/60 text-left text-xs uppercase tracking-wider text-slate-400">
                  {(
                    [
                      { key: 'username', label: t.users.colUser, className: 'px-4 py-3' },
                      { key: 'role', label: t.users.colRole, className: 'px-4 py-3' },
                      { key: 'createdAt', label: t.users.colRegistered, className: 'px-4 py-3 hidden md:table-cell' },
                      { key: 'status', label: t.users.colStatus, className: 'px-4 py-3' },
                    ] as const
                  ).map((col) => (
                    <th key={col.key} className={col.className}>
                      <button
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-slate-100 ${
                          sortKey === col.key ? 'text-slate-100' : ''
                        }`}
                      >
                        {col.label}
                        <span className="text-[10px]">{sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">{t.users.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => navigate(`/members/${user.id}`)}
                    className="cursor-pointer border-b border-surface-800/60 transition-colors last:border-0 hover:bg-surface-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-100">{user.username}</div>
                          <div className="truncate text-xs text-slate-500">{user.email ?? t.users.emailHidden}</div>
                        </div>
                      </div>
                    </td>
                      <td className="px-4 py-3">
                        <span className={`badge border ${roleBadgeClass(user.role)}`}>{user.role}</span>
                      </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">
                      {formatDateTime(user.createdAt, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge border px-2 py-0.5 text-[11px] ${
                          user.isBanned
                            ? 'border-danger-500/40 bg-danger-500/10 text-danger-400'
                            : 'border-success-500/40 bg-success-500/10 text-success-400'
                        }`}
                      >
                        {user.isBanned ? t.users.banned : t.users.active}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canChangeRoles && (
                          <div onClick={(event) => event.stopPropagation()}>
                            <RoleChangeSelect
                              user={user}
                              users={users}
                              onChanged={() => void reload()}
                            />
                          </div>
                        )}
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            void toggleBan(user)
                          }}
                          disabled={busyId === user.id || !canBanUser(currentRole, user, selfIdentity)}
                          title={
                            canBanUser(currentRole, user, selfIdentity) ? undefined : t.users.banNotAllowed
                          }
                          className={user.isBanned ? 'btn-ghost h-8 px-3 text-xs' : 'btn-danger h-8 px-3 text-xs'}
                        >
                          {busyId === user.id ? '...' : user.isBanned ? t.users.unban : t.users.ban}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-700/60 px-4 py-3 text-xs text-slate-400">
            <span>{t.users.showing(rangeFrom, rangeTo, visibleUsers.length)}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage <= 1}
                className="btn-ghost h-8 px-3 text-xs disabled:opacity-40"
              >
                {t.users.prev}
              </button>
              <span>{t.users.page(safePage, totalPages)}</span>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage >= totalPages}
                className="btn-ghost h-8 px-3 text-xs disabled:opacity-40"
              >
                {t.users.next}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
