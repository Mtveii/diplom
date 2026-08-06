import { useCallback, useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import { membersApi } from '@/services/api/members.api'
import type {
  InternalRank,
  MemberProfileHistoryDto,
  MemberStatus,
  MemberWarningDto,
  WarningSeverity,
} from '@/types/member'
import type { ClanMemberDto } from '@/types/member'

const ranks: InternalRank[] = ['Recruit', 'Member', 'Officer', 'Leader']
const severities: WarningSeverity[] = ['Low', 'Medium', 'High']

interface MemberDetailModalProps {
  member: ClanMemberDto
  onClose: () => void
  onChanged: () => void
}

export default function MemberDetailModal({ member, onClose, onChanged }: MemberDetailModalProps) {
  const [warnings, setWarnings] = useState<MemberWarningDto[]>([])
  const [history, setHistory] = useState<MemberProfileHistoryDto[]>([])
  const [rank, setRank] = useState<InternalRank>(member.internalRank)
  const [status, setStatus] = useState<MemberStatus>(member.status)
  const [reason, setReason] = useState('')
  const [severity, setSeverity] = useState<WarningSeverity>('Medium')
  const [banDays, setBanDays] = useState('')
  const [muteDays, setMuteDays] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [warns, profHistory] = await Promise.all([
      membersApi.getWarnings(member.id),
      membersApi.getProfileHistory(member.id),
    ])
    setWarnings(warns)
    setHistory(profHistory)
  }, [member.id])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleSaveRank = async () => {
    setMessage(null)
    await membersApi.updateRank(member.id, rank)
    setMessage('Ранг обновлён')
    onChanged()
  }

  const handleSetStatus = async (newStatus: MemberStatus) => {
    setMessage(null)
    await membersApi.setStatus(member.id, newStatus)
    setStatus(newStatus)
    setMessage('Статус обновлён')
    onChanged()
  }

  const handleIssueWarning = async () => {
    setMessage(null)
    await membersApi.issueWarning({
      memberId: member.id,
      reason,
      severity,
      banForDays: banDays ? Number(banDays) : undefined,
      muteForDays: muteDays ? Number(muteDays) : undefined,
    })
    setReason('')
    setBanDays('')
    setMuteDays('')
    await reload()
    setMessage('Предупреждение выдано')
  }

  const handleDeactivate = async (warningId: number) => {
    await membersApi.deactivateWarning(warningId)
    await reload()
  }

  return (
    <Modal open title={member.username} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {member.avatarUrl ? (
            <img className="h-14 w-14 rounded-full border border-surface-700" src={member.avatarUrl} alt="avatar" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-lg font-bold text-white">
              {member.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold text-white">{member.username}</div>
            <div className="text-xs text-slate-400">
              SteamID64: {member.steamId64} · в клане с {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
            </div>
          </div>
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Ранг и статус</h3>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={rank}
              onChange={(event) => setRank(event.target.value as InternalRank)}
              className="input bg-surface-950"
            >
              {ranks.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button onClick={() => void handleSaveRank()} className="btn-primary px-3 py-1.5 text-xs">
              Сохранить
            </button>
            <div className="ml-2 flex gap-2 text-xs">
              {(['Active', 'Muted', 'Banned'] as MemberStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => void handleSetStatus(s)}
                  className={`rounded-lg border px-3 py-1.5 transition-colors ${
                    status === s
                      ? 'border-primary-500 bg-primary-600/20 text-primary-300'
                      : 'border-surface-700 text-slate-300 hover:bg-surface-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Выдать предупреждение/бан/мут</h3>
          <div className="flex flex-col gap-2">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Причина"
              className="input resize-none"
              rows={2}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value as WarningSeverity)}
                className="input bg-surface-950"
              >
                {severities.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                value={banDays}
                onChange={(event) => setBanDays(event.target.value)}
                placeholder="Бан, дней"
                type="number"
                className="input w-28"
              />
              <input
                value={muteDays}
                onChange={(event) => setMuteDays(event.target.value)}
                placeholder="Мут, дней"
                type="number"
                className="input w-28"
              />
              <button
                onClick={() => void handleIssueWarning()}
                className="btn bg-warning-500 text-white shadow-glow hover:brightness-110 active:scale-[0.98]"
              >
                Выдать
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-success-600/40 bg-success-500/10 px-3 py-2 text-xs text-success-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
            {message}
          </div>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Предупреждения</h3>
          {warnings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-6 text-center text-xs text-slate-500">
              Нет предупреждений
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {warnings.map((warning) => (
                <div
                  key={warning.id}
                  className="flex items-center justify-between rounded-xl border border-surface-700 bg-surface-950/60 p-3 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge ${
                          warning.severity === 'High'
                            ? 'bg-danger-500/15 text-danger-400'
                            : warning.severity === 'Medium'
                              ? 'bg-warning-500/15 text-warning-400'
                              : 'bg-slate-500/15 text-slate-300'
                        }`}
                      >
                        {warning.severity}
                      </span>
                      <span className="text-slate-100">{warning.reason}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {new Date(warning.issuedAt).toLocaleString('ru-RU')}
                      {warning.expiresAt && ` · до ${new Date(warning.expiresAt).toLocaleDateString('ru-RU')}`}
                      {warning.isActive ? '' : ' · истекло'}
                    </div>
                  </div>
                  {warning.isActive && (
                    <button
                      onClick={() => void handleDeactivate(warning.id)}
                      className="rounded-lg border border-rose-800/60 px-2.5 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-950/50"
                    >
                      Снять
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-200">История профиля</h3>
          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-6 text-center text-xs text-slate-500">
              Изменений не обнаружено (трекается polling-джобой)
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 text-xs text-slate-400">
              {history.slice(0, 10).map((entry) => (
                <div key={entry.id} className="rounded-lg bg-surface-950/60 px-3 py-2">
                  {new Date(entry.changedAt).toLocaleDateString('ru-RU')} · {entry.field}: {entry.oldValue} →{' '}
                  <span className="text-slate-200">{entry.newValue}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}