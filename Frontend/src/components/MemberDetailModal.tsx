import { useCallback, useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import { EmptyState } from '@/components/PageState'
import { membersApi } from '@/services/api/members.api'
import { toast } from '@/store/toastStore'
import { formatHours, formatRelativeDate } from '@/utils/format'
import type {
  ClanMemberDto,
  InternalRank,
  MemberProfileHistoryDto,
  MemberStatus,
  MemberWarningDto,
  WarningSeverity,
} from '@/types/member'

const ranks: InternalRank[] = ['Recruit', 'Member', 'Officer', 'Leader']
const severities: WarningSeverity[] = ['Low', 'Medium', 'High']

const STATUS_BADGE: Record<MemberStatus, string> = {
  Active: 'bg-success-500/15 text-success-400',
  Pending: 'bg-warning-500/15 text-warning-400',
  Muted: 'bg-amber-500/15 text-amber-300',
  Banned: 'bg-danger-500/15 text-danger-400',
}

type Tab = 'overview' | 'games' | 'activity' | 'history'

interface MemberDetailModalProps {
  member: ClanMemberDto
  onClose: () => void
  onChanged: () => void
}

export default function MemberDetailModal({ member, onClose, onChanged }: MemberDetailModalProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [warnings, setWarnings] = useState<MemberWarningDto[]>([])
  const [history, setHistory] = useState<MemberProfileHistoryDto[]>([])
  const [rank, setRank] = useState<InternalRank>(member.internalRank)
  const [status, setStatus] = useState<MemberStatus>(member.status)
  const [reason, setReason] = useState('')
  const [severity, setSeverity] = useState<WarningSeverity>('Medium')
  const [banDays, setBanDays] = useState('')
  const [muteDays, setMuteDays] = useState('')

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
    try {
      await membersApi.updateRank(member.id, rank)
      toast.success('Ранг обновлён', `${member.username} → ${rank}`)
      onChanged()
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    }
  }

  const handleSetStatus = async (newStatus: MemberStatus) => {
    try {
      await membersApi.setStatus(member.id, newStatus)
      setStatus(newStatus)
      toast.success('Статус обновлён', `${member.username} → ${newStatus}`)
      onChanged()
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    }
  }

  const handleIssueWarning = async () => {
    if (!reason.trim()) {
      toast.warning('Укажите причину')
      return
    }
    try {
      await membersApi.issueWarning({
        memberId: member.id,
        reason: reason.trim(),
        severity,
        banForDays: banDays ? Number(banDays) : undefined,
        muteForDays: muteDays ? Number(muteDays) : undefined,
      })
      setReason('')
      setBanDays('')
      setMuteDays('')
      await reload()
      toast.success('Предупреждение выдано', severity)
      onChanged()
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    }
  }

  const handleDeactivate = async (warningId: number) => {
    try {
      await membersApi.deactivateWarning(warningId)
      await reload()
      toast.success('Предупреждение снято')
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    }
  }

  const onlineState = member.isOnline
    ? member.currentGameName
      ? `В игре: ${member.currentGameName}`
      : 'Онлайн'
    : 'Офлайн'

  return (
    <Modal open title={member.username} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {member.avatarUrl ? (
              <img className="h-16 w-16 rounded-full border border-surface-700" src={member.avatarUrl} alt="avatar" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-xl font-bold text-white">
                {member.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white">{member.username}</span>
                <span className={`badge ${STATUS_BADGE[member.status]}`}>{member.status}</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">SteamID64: {member.steamId64}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Playtime', value: formatHours(member.minutesPlayedTotal) },
            { label: 'Last online', value: member.lastSeenAt ? formatRelativeDate(member.lastSeenAt) : '—' },
            { label: 'Joined', value: new Date(member.joinedAt).toLocaleDateString('ru-RU') },
            { label: 'Сейчас', value: onlineState },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-surface-700 bg-surface-950/60 px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-100" title={stat.value}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b border-surface-700">
          {(['overview', 'games', 'activity', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-primary-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="flex flex-col gap-4">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Ранг</h3>
              <div className="flex flex-wrap items-center gap-3">
                <select value={rank} onChange={(event) => setRank(event.target.value as InternalRank)} className="input bg-surface-950">
                  {ranks.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button onClick={() => void handleSaveRank()} className="btn-primary px-3 py-1.5 text-xs">
                  Сохранить
                </button>
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Статус</h3>
              <div className="flex flex-wrap gap-2 text-xs">
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
            </section>
          </div>
        )}

        {tab === 'games' && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Игры</h3>
            {member.currentGameName ? (
              <div className="flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-950/60 p-3">
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-primary-400" />
                <span className="text-sm text-slate-200">{member.currentGameName}</span>
                <span className="ml-auto text-xs text-slate-500">сейчас в игре</span>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-surface-700">
                <EmptyState title="Список игр недоступен" description="Детальная библиотека игр участника пока не собирается" />
              </div>
            )}
          </section>
        )}

        {tab === 'activity' && (
          <div className="flex flex-col gap-4">
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
                  <select value={severity} onChange={(event) => setSeverity(event.target.value as WarningSeverity)} className="input bg-surface-950">
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
                  <button onClick={() => void handleIssueWarning()} className="btn bg-warning-500 text-white shadow-glow hover:brightness-110 active:scale-[0.98]">
                    Выдать
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Предупреждения</h3>
              {warnings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-700 px-4 py-6 text-center text-xs text-slate-500">
                  Нет предупреждений
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {warnings.map((warning) => (
                    <div key={warning.id} className="flex items-center justify-between rounded-xl border border-surface-700 bg-surface-950/60 p-3 text-sm">
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
                          {warning.isActive ? '' : ' · снято'}
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
          </div>
        )}

        {tab === 'history' && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">История профиля</h3>
            {history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-700 px-4 py-6 text-center text-xs text-slate-500">
                Изменений не обнаружено (трекается polling-джобой)
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 text-xs text-slate-400">
                {history.slice(0, 20).map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-baseline gap-2 rounded-lg bg-surface-950/60 px-3 py-2">
                    <span className="shrink-0 font-medium text-slate-500">
                      {new Date(entry.changedAt).toLocaleDateString('ru-RU')}
                    </span>
                    <span className="shrink-0 text-slate-300">{entry.field}:</span>
                    {entry.oldValue ? (
                      <span className="shrink-0 line-through opacity-60">{entry.oldValue}</span>
                    ) : (
                      <span className="shrink-0 text-slate-600">—</span>
                    )}
                    <svg className="h-3 w-3 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                    <span className="font-medium text-slate-100">{entry.newValue}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  )
}
