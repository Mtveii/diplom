import { useState } from 'react'
import ErrorState from '@/components/ErrorState'
import MemberCard from '@/components/MemberCard'
import MemberDetailModal from '@/components/MemberDetailModal'
import Modal from '@/components/Modal'
import Spinner from '@/components/Spinner'
import { useClanMembers } from '@/hooks/useClanMembers'
import { membersApi } from '@/services/api/members.api'
import type { ClanMemberDto, InternalRank, MemberStatus } from '@/types/member'

const rankOptions: Array<InternalRank | ''> = ['', 'Leader', 'Officer', 'Member', 'Recruit']
const statusOptions: Array<MemberStatus | ''> = ['', 'Active', 'Pending', 'Muted', 'Banned']

export default function ClanMembersPage() {
  const { members, loading, error, search, setSearch, status, setStatus, rank, setRank, reload } =
    useClanMembers()
  const [selected, setSelected] = useState<ClanMemberDto | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newSteamId, setNewSteamId] = useState('')
  const [newRank, setNewRank] = useState<InternalRank>('Recruit')
  const [groupId, setGroupId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleAddMember = async () => {
    setFormError(null)
    try {
      await membersApi.create(newSteamId, newRank)
      setNewSteamId('')
      setShowAdd(false)
      await reload()
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
      window.alert(`Импортировано новых участников: ${result.added}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось импортировать группу')
    }
  }

  if (loading) {
    return <Spinner />
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Участники клана</h1>
          <p className="mt-0.5 text-sm text-slate-400">Карточки участников, роли и статусы</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить / импорт
        </button>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
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
            className="input w-full pl-9"
          />
        </div>
        <select
          value={rank}
          onChange={(event) => setRank((event.target.value || undefined) as InternalRank | undefined)}
          className="input bg-surface-950"
        >
          {rankOptions.map((option) => (
            <option key={option || 'any'} value={option}>
              {option || 'Все ранги'}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus((event.target.value || undefined) as MemberStatus | undefined)}
          className="input bg-surface-950"
        >
          {statusOptions.map((option) => (
            <option key={option || 'any'} value={option}>
              {option || 'Все статусы'}
            </option>
          ))}
        </select>
      </div>

      {members.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 border-dashed border-surface-700 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-700 bg-surface-800/60 text-slate-400">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="text-sm text-slate-400">
            Участники не найдены. Добавьте первого участника вручную или импортируйте Steam-группу.
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} onOpen={setSelected} />
          ))}
        </div>
      )}

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
          <select
            value={newRank}
            onChange={(event) => setNewRank(event.target.value as InternalRank)}
            className="input bg-surface-950"
          >
            {rankOptions.slice(1).map((option) => (
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
    </div>
  )
}