import Modal from './Modal'
import type { InternalRank } from '@/types/member'

const rankOptions: InternalRank[] = ['Recruit', 'Member', 'Officer', 'Leader']

interface MemberAddModalProps {
  open: boolean
  onClose: () => void
  onAdd: () => void
  onImport: () => void
  newSteamId: string
  setNewSteamId: (v: string) => void
  newRank: InternalRank
  setNewRank: (v: InternalRank) => void
  groupId: string
  setGroupId: (v: string) => void
  formError: string | null
  busy: boolean
}

export default function MemberAddModal({
  open,
  onClose,
  onAdd,
  onImport,
  newSteamId,
  setNewSteamId,
  newRank,
  setNewRank,
  groupId,
  setGroupId,
  formError,
  busy,
}: MemberAddModalProps) {
  return (
    <Modal open={open} title="Добавить или импортировать участника" onClose={onClose}>
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
          <button onClick={onAdd} disabled={busy} className="btn-primary flex-1">
            Добавить
          </button>
          <button onClick={onImport} disabled={busy} className="btn-ghost flex-1">
            Импортировать группу
          </button>
        </div>
      </div>
    </Modal>
  )
}
