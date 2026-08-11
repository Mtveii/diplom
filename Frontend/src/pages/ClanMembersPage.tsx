import { useEffect, useMemo, useRef, useState } from 'react'
import ErrorState from '@/components/ErrorState'
import MemberCard from '@/components/MemberCard'
import MemberDetailModal from '@/components/MemberDetailModal'
import Modal from '@/components/Modal'
import ConfirmModal from '@/components/ConfirmModal'
import { EmptyState, PageSkeleton } from '@/components/PageState'
import { useClanMembers } from '@/hooks/useClanMembers'
import { membersApi } from '@/services/api/members.api'
import { toast } from '@/store/toastStore'
import { formatHours, formatRelativeDate } from '@/utils/format'
import type { ClanMemberDto, InternalRank, MemberStatus } from '@/types/member'

const rankOptions: InternalRank[] = ['Recruit', 'Member', 'Officer', 'Leader']
const statusOptions: MemberStatus[] = ['Active', 'Pending', 'Muted', 'Banned']

type ViewMode = 'grid' | 'table'
type ActivityFilter = 'any' | 'online' | 'ingame' | 'offline'
type LastOnlineFilter = 'any' | '1h' | '1d' | '7d' | '30d' | 'never'

interface ConfirmState {
  type: 'mute' | 'ban' | 'remove'
  member: ClanMemberDto
}

interface RankChangeState {
  member?: ClanMemberDto
  bulk?: boolean
}

const RANK_BADGE: Record<InternalRank, string> = {
  Leader: 'bg-purple-500/15 text-purple-300',
  Officer: 'bg-sky-500/15 text-sky-300',
  Member: 'bg-primary-500/15 text-primary-300',
  Recruit: 'bg-slate-500/15 text-slate-300',
}

const STATUS_BADGE: Record<MemberStatus, string> = {
  Active: 'bg-success-500/15 text-success-400',
  Pending: 'bg-warning-500/15 text-warning-400',
  Muted: 'bg-amber-500/15 text-amber-300',
  Banned: 'bg-danger-500/15 text-danger-400',
}

function isWithinLast(lastSeenAt: string | null, hours: number | null, now = Date.now()): boolean {
  if (hours === null) {
    return lastSeenAt == null
  }
  if (!lastSeenAt) {
    return false
  }
  return now - new Date(lastSeenAt).getTime() <= hours * 3600_000
}

export default function ClanMembersPage() {
  const { members, loading, error, search, setSearch, status, setStatus, rank, setRank, reload } =
    useClanMembers()
  const [view, setView] = useState<ViewMode>('table')
  const [activity, setActivity] = useState<ActivityFilter>('any')
  const [lastOnline, setLastOnline] = useState<LastOnlineFilter>('any')
  const [selected, setSelected] = useState<ClanMemberDto | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [rankChange, setRankChange] = useState<RankChangeState | null>(null)
  const [rankValue, setRankValue] = useState<InternalRank>('Recruit')
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newSteamId, setNewSteamId] = useState('')
  const [newRank, setNewRank] = useState<InternalRank>('Recruit')
  const [groupId, setGroupId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuFor(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtersActive = search !== '' || rank !== undefined || status !== undefined || activity !== 'any' || lastOnline !== 'any'

  const filtered = useMemo(() => {
    return members.filter((member) => {
      if (activity === 'online' && !(member.isOnline && !member.currentGameName)) {
        return false
      }
      if (activity === 'ingame' && !(member.isOnline && member.currentGameName)) {
        return false
      }
      if (activity === 'offline' && member.isOnline) {
        return false
      }
      const hours = lastOnline === 'any' ? null : lastOnline === 'never' ? 0 : Number(lastOnline.slice(0, -1)) * 24
      if (lastOnline === 'never') {
        if (member.lastSeenAt != null) {
          return false
        }
      } else if (lastOnline !== 'any') {
        if (!member.lastSeenAt || !isWithinLast(member.lastSeenAt, hours)) {
          return false
        }
      }
      return true
    })
  }, [members, activity, lastOnline])

  const allSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id))

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        filtered.forEach((m) => next.delete(m.id))
      } else {
        filtered.forEach((m) => next.add(m.id))
      }
      return next
    })
  }

  const resetFilters = () => {
    setSearch('')
    setStatus(undefined)
    setRank(undefined)
    setActivity('any')
    setLastOnline('any')
  }

  const handleAddMember = async () => {
    setFormError(null)
    try {
      await membersApi.create(newSteamId, newRank)
      setNewSteamId('')
      setShowAdd(false)
      await reload()
      toast.success('Участник добавлен', newSteamId)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось добавить участника')
    }
  }

  const handleImport = async () => {
    setFormError(null)
    try {
      const result = await membersApi.importFromSteamGroup(groupId)
      setGroupId('')
      setShowAdd(false)
      await reload()
      toast.success('Импорт завершён', `Добавлено новых участников: ${result.added}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось импортировать группу')
    }
  }

  const runBulk = async (operation: (member: ClanMemberDto) => Promise<unknown>, successMessage: string) => {
    setBusy(true)
    try {
      const items = members.filter((m) => selectedIds.has(m.id))
      await Promise.all(items.map(operation))
      toast.success(successMessage, `${items.length} участн.`)
      setSelectedIds(new Set())
      await reload()
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirm) {
      return
    }
    setBusy(true)
    try {
      if (confirm.type === 'remove') {
        await membersApi.remove(confirm.member.id)
        toast.success('Участник удалён', confirm.member.username)
      } else {
        const newStatus: MemberStatus = confirm.type === 'ban' ? 'Banned' : 'Muted'
        await membersApi.setStatus(confirm.member.id, newStatus)
        toast.success('Статус обновлён', `${confirm.member.username} → ${newStatus}`)
      }
      setConfirm(null)
      await reload()
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const handleChangeRank = async () => {
    if (!rankChange) {
      return
    }
    setBusy(true)
    try {
      if (rankChange.bulk) {
        await runBulk((m) => membersApi.updateRank(m.id, rankValue), 'Ранг обновлён')
        setRankChange(null)
      } else if (rankChange.member) {
        await membersApi.updateRank(rankChange.member.id, rankValue)
        toast.success('Ранг обновлён', `${rankChange.member.username} → ${rankValue}`)
        setRankChange(null)
        await reload()
      }
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const renderActivity = (member: ClanMemberDto) => {
    if (member.isOnline && member.currentGameName) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-primary-300">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary-400" />
          <span className="max-w-40 truncate" title={member.currentGameName}>
            {member.currentGameName}
          </span>
        </div>
      )
    }
    if (member.isOnline) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-success-400">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success-400" />
          Онлайн
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        Офлайн
      </div>
    )
  }

  const renderActionsMenu = (member: ClanMemberDto) => (
    <div ref={menuRef}>
      <button
        onClick={() => setMenuFor(menuFor === member.id ? null : member.id)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-surface-800 hover:text-white"
        aria-label="Действия"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {menuFor === member.id && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 animate-scale-in rounded-xl border border-surface-700/60 bg-surface-900/95 p-1.5 shadow-card backdrop-blur-md">
          <button
            onClick={() => {
              setMenuFor(null)
              setSelected(member)
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-surface-800 hover:text-white"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View profile
          </button>
          <button
            onClick={() => {
              setMenuFor(null)
              setRankValue(member.internalRank)
              setRankChange({ member })
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-surface-800 hover:text-white"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Change rank
          </button>
          <button
            onClick={() => {
              setMenuFor(null)
              setConfirm({ type: 'mute', member })
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-surface-800 hover:text-white"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
              <path d="M2 22a10 10 0 0 1 20 0" />
            </svg>
            Mute
          </button>
          <button
            onClick={() => {
              setMenuFor(null)
              setConfirm({ type: 'ban', member })
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-surface-800 hover:text-white"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
            </svg>
            Ban
          </button>
          <div className="my-1 h-px bg-surface-800" />
          <button
            onClick={() => {
              setMenuFor(null)
              setConfirm({ type: 'remove', member })
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-950/50 hover:text-rose-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Remove
          </button>
        </div>
      )}
    </div>
  )

  if (loading) {
    return <PageSkeleton variant="table" count={8} />
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-white">
            Участники клана
            <span className="badge ml-2 border border-surface-700 bg-surface-800/60 text-slate-300">
              {filtered.length}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">Управление участниками, ролями и статусами</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-surface-700 bg-surface-800/40 p-1">
            <button
              onClick={() => setView('grid')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'grid' ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-100'
              }`}
              title="Сетка карточек"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'table' ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-100'
              }`}
              title="Таблица"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Добавить
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-ghost"
            title="Импорт Steam-группы в окне добавления"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Импорт
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-2.5 p-3">
        <div className="relative min-w-56 flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по нику/SteamID64..."
            className="input h-11 w-full pl-9"
          />
        </div>
        <select
          value={rank ?? ''}
          onChange={(event) => setRank((event.target.value || undefined) as InternalRank | undefined)}
          className="input h-11 bg-surface-950"
        >
          <option value="">Все ранги</option>
          {rankOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={status ?? ''}
          onChange={(event) => setStatus((event.target.value || undefined) as MemberStatus | undefined)}
          className="input h-11 bg-surface-950"
        >
          <option value="">Все статусы</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select value={activity} onChange={(event) => setActivity(event.target.value as ActivityFilter)} className="input h-11 bg-surface-950">
          <option value="any">Активность: все</option>
          <option value="online">Онлайн</option>
          <option value="ingame">В игре</option>
          <option value="offline">Офлайн</option>
        </select>
        <select value={lastOnline} onChange={(event) => setLastOnline(event.target.value as LastOnlineFilter)} className="input h-11 bg-surface-950">
          <option value="any">Last online: все</option>
          <option value="1h">за час</option>
          <option value="1d">за сутки</option>
          <option value="7d">за неделю</option>
          <option value="30d">за месяц</option>
          <option value="never">никогда</option>
        </select>
        {filtersActive && (
          <button onClick={resetFilters} className="btn-ghost h-11 px-3 text-xs">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="card flex h-full flex-col items-center justify-center border-dashed">
            <EmptyState
              title="Участники не найдены"
              description="Попробуйте изменить фильтры или добавьте первого участника"
              actionLabel={filtersActive ? 'Сбросить фильтры' : 'Добавить участника'}
              onAction={filtersActive ? resetFilters : () => setShowAdd(true)}
            />
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((member) => (
              <MemberCard key={member.id} member={member} onOpen={setSelected} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedIds.size > 0 && (
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-500/40 bg-surface-900/90 px-4 py-2.5 shadow-glow backdrop-blur-md">
                <span className="text-sm text-slate-200">
                  Выбрано: <span className="font-semibold text-white">{selectedIds.size}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRankValue('Member')
                      setRankChange({ bulk: true })
                    }}
                    disabled={busy}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    Change rank
                  </button>
                  <button
                    onClick={() => void runBulk((m) => membersApi.setStatus(m.id, 'Muted'), 'Мут применён')}
                    disabled={busy}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    Mute
                  </button>
                  <button
                    onClick={() => void runBulk((m) => membersApi.remove(m.id), 'Участники удалены')}
                    disabled={busy}
                    className="btn-danger px-3 py-1.5 text-xs"
                  >
                    Remove
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} disabled={busy} className="text-xs text-slate-400 hover:text-white">
                    Отменить
                  </button>
                </div>
              </div>
            )}

            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700/80 text-left text-xs text-slate-400">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer accent-primary-500"
                        aria-label="Выбрать всех"
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">Player</th>
                    <th className="px-3 py-3 font-medium">Rank</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Playtime</th>
                    <th className="px-3 py-3 font-medium">Last online</th>
                    <th className="px-3 py-3 font-medium">Joined</th>
                    <th className="px-3 py-3 font-medium">Activity</th>
                    <th className="w-14 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member) => (
                    <tr key={member.id} className="border-b border-surface-800/60 transition-colors last:border-0 hover:bg-surface-800/30">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(member.id)}
                          onChange={() => toggleSelect(member.id)}
                          className="h-4 w-4 cursor-pointer accent-primary-500"
                          aria-label={`Выбрать ${member.username}`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => setSelected(member)}
                          className="flex items-center gap-2.5 text-left"
                        >
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-surface-700" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">
                              {member.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="max-w-48 truncate font-medium text-slate-100 hover:text-white" title={member.steamId64}>
                            {member.username}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge ${RANK_BADGE[member.internalRank]}`}>{member.internalRank}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge ${STATUS_BADGE[member.status]}`}>{member.status}</span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-300">{formatHours(member.minutesPlayedTotal)}</td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {member.lastSeenAt ? formatRelativeDate(member.lastSeenAt) : 'никогда'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-3 py-2.5">{renderActivity(member)}</td>
                      <td className="relative px-4 py-2.5">{renderActionsMenu(member)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <MemberDetailModal member={selected} onClose={() => setSelected(null)} onChanged={reload} />
      )}

      <Modal open={showAdd} title="Добавить участника" onClose={() => setShowAdd(false)}>
        <div className="flex flex-col gap-3">
          <label className="text-sm text-slate-300">SteamID64</label>
          <input
            value={newSteamId}
            onChange={(event) => setNewSteamId(event.target.value)}
            placeholder="e.g. 76561198000000000"
            className="input"
          />
          <label className="text-sm text-slate-300">Ранг</label>
          <select value={newRank} onChange={(event) => setNewRank(event.target.value as InternalRank)} className="input bg-surface-950">
            {rankOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="my-2 h-px bg-surface-800" />

          <label className="text-sm text-slate-300">Импорт всей Steam-группы (GID)</label>
          <input
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            placeholder="e.g. 103582791433224455"
            className="input"
          />

          {formError && (
            <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <button onClick={() => void handleAddMember()} className="btn-primary flex-1">
              Добавить
            </button>
            <button onClick={() => void handleImport()} className="btn-ghost flex-1">
              Импортировать группу
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirm !== null}
        title={confirm ? (confirm.type === 'remove' ? 'Удалить участника?' : confirm.type === 'ban' ? 'Забанить участника?' : 'Замутить участника?') : ''}
        description={
          confirm
            ? confirm.type === 'remove'
              ? 'Это действие нельзя отменить.'
              : 'Статус участника будет изменён.'
            : ''
        }
        confirmLabel={confirm ? (confirm.type === 'remove' ? 'Удалить' : confirm.type === 'ban' ? 'Забанить' : 'Замутить') : ''}
        loading={busy}
        onConfirm={() => void handleConfirmAction()}
        onClose={() => setConfirm(null)}
      >
        {confirm && (
          <div className="flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-950/60 p-3">
            {confirm.member.avatarUrl ? (
              <img src={confirm.member.avatarUrl} alt="" className="h-10 w-10 rounded-full border border-surface-700" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
                {confirm.member.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{confirm.member.username}</div>
              <div className="truncate text-xs text-slate-500">{confirm.member.steamId64}</div>
            </div>
          </div>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={rankChange !== null}
        title={rankChange?.bulk ? 'Изменить ранг участников' : 'Изменить ранг'}
        description="Выберите новый ранг"
        tone="primary"
        confirmLabel="Сохранить"
        loading={busy}
        onConfirm={() => void handleChangeRank()}
        onClose={() => setRankChange(null)}
      >
        <select value={rankValue} onChange={(event) => setRankValue(event.target.value as InternalRank)} className="input w-full bg-surface-950">
          {rankOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </ConfirmModal>
    </div>
  )
}
