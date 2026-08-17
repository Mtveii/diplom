import { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import ErrorState from '@/components/ErrorState'
import Modal from '@/components/Modal'
import { EmptyState, PageSkeleton } from '@/components/PageState'
import { applicationsApi } from '@/services/api/members.api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { formatRelativeDate } from '@/utils/format'
import type { ApplicationStatus, MembershipApplicationDto } from '@/types/member'

type Tab = ApplicationStatus | 'All'
type DateFilter = 'any' | '1d' | '7d' | '30d'
type ReviewerFilter = 'any' | 'me' | 'none'

const REJECT_REASONS = ['Недостаточно информации', 'Не соответствует требованиям', 'Дубликат заявки', 'Другое']

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  Pending: 'bg-warning-500/15 text-warning-400',
  Approved: 'bg-success-500/15 text-success-400',
  Rejected: 'bg-danger-500/15 text-danger-400',
}

interface RejectState {
  application: MembershipApplicationDto
  reason: string
  comment: string
}

export default function ApplicationsPage() {
  const currentUserId = useAuthStore((state) => state.user?.id)
  const [applications, setApplications] = useState<MembershipApplicationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newSteamId, setNewSteamId] = useState('')
  const [tab, setTab] = useState<Tab>('Pending')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('any')
  const [reviewer, setReviewer] = useState<ReviewerFilter>('any')
  const [selected, setSelected] = useState<MembershipApplicationDto | null>(null)
  const [moderatorComment, setModeratorComment] = useState('')
  const [rejectFor, setRejectFor] = useState<RejectState | null>(null)
  const [approveFor, setApproveFor] = useState<MembershipApplicationDto | null>(null)
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      setApplications(await applicationsApi.getAll())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const cutoff = dateFilter === 'any' ? 0 : Date.now() - Number(dateFilter.slice(0, -1)) * 24 * 3600_000
    return applications.filter((app) => {
      if (tab !== 'All' && app.status !== tab) {
        return false
      }
      if (q && !app.username?.toLowerCase().includes(q) && !app.steamId64.includes(q)) {
        return false
      }
      if (dateFilter !== 'any' && new Date(app.createdAt).getTime() < cutoff) {
        return false
      }
      if (reviewer === 'me' && app.reviewedByUserId !== currentUserId) {
        return false
      }
      if (reviewer === 'none' && app.reviewedByUserId != null) {
        return false
      }
      return true
    })
  }, [applications, tab, search, dateFilter, reviewer, currentUserId])

  const counts = useMemo(
    () => ({
      Pending: applications.filter((a) => a.status === 'Pending').length,
      Approved: applications.filter((a) => a.status === 'Approved').length,
      Rejected: applications.filter((a) => a.status === 'Rejected').length,
    }),
    [applications],
  )

  const filtersActive = search !== '' || dateFilter !== 'any' || reviewer !== 'any'

  const handleSubmit = async () => {
    if (!newSteamId.trim()) {
      toast.warning('Укажите SteamID64')
      return
    }
    try {
      await applicationsApi.submit(newSteamId.trim())
      setNewSteamId('')
      await reload()
      toast.success('Заявка подана', newSteamId.trim())
    } catch (err) {
      toast.error('Не удалось подать заявку', err instanceof Error ? err.message : undefined)
    }
  }

  const doReview = async (id: number, decision: 'Approved' | 'Rejected', comment?: string) => {
    setBusy(true)
    try {
      await applicationsApi.review(id, decision, comment)
      toast.success(decision === 'Approved' ? 'Заявка одобрена' : 'Заявка отклонена')
      setSelected(null)
      setModeratorComment('')
      setBulkSelected(new Set())
      await reload()
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const handleBulk = async (decision: 'Approved' | 'Rejected') => {
    setBusy(true)
    try {
      const items = filtered.filter((app) => bulkSelected.has(app.id))
      const comment =
        decision === 'Rejected'
          ? rejectFor?.reason === 'Other' || !rejectFor?.reason
            ? rejectFor?.comment
            : rejectFor?.reason
          : undefined
      await Promise.all(items.map((app) => applicationsApi.review(app.id, decision, comment)))
      toast.success(decision === 'Approved' ? 'Заявки одобрены' : 'Заявки отклонены', `${items.length} шт.`)
      setBulkAction(null)
      setBulkSelected(new Set())
      await reload()
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <PageSkeleton variant="lines" count={6} />
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void reload()} />
  }

  const steamProfileUrl = (steamId64: string) => `https://steamcommunity.com/profiles/${steamId64}`

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-white">Заявки на вступление</h1>
        <p className="mt-1 text-sm text-slate-400">Рассмотрение кандидатов на вступление в клан</p>
      </div>

      <div className="card card-hud card-hud--sm flex flex-col gap-3 p-4 sm:flex-row">
        <input
          value={newSteamId}
          onChange={(event) => setNewSteamId(event.target.value)}
          placeholder="SteamID64 нового кандидата"
          className="input flex-1"
        />
        <button onClick={() => void handleSubmit()} className="btn-primary">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Подать заявку
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-surface-700 bg-surface-800/40 p-1">
          {(['Pending', 'Approved', 'Rejected', 'All'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                tab === t ? 'hud-tab-active' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t}
              {t !== 'All' && (
                <span className={`rounded-full px-1.5 text-[10px] ${tab === t ? 'bg-surface-950/20' : 'bg-surface-800 text-slate-400'}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по нику/SteamID..."
            className="input h-10 w-56"
          />
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} className="input h-10 bg-surface-950">
            <option value="any">Дата: все</option>
            <option value="1d">за сутки</option>
            <option value="7d">за неделю</option>
            <option value="30d">за месяц</option>
          </select>
          <select value={reviewer} onChange={(event) => setReviewer(event.target.value as ReviewerFilter)} className="input h-10 bg-surface-950">
            <option value="any">Модератор: все</option>
            <option value="me">рассмотрено мной</option>
            <option value="none">не рассмотрено</option>
          </select>
          {filtersActive && (
            <button
              onClick={() => {
                setSearch('')
                setDateFilter('any')
                setReviewer('any')
              }}
              className="btn-ghost h-10 px-3 text-xs"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div>
        {bulkSelected.size > 0 && (
          <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-500/40 bg-surface-900/90 px-4 py-2.5 shadow-glow backdrop-blur-md">
            <span className="text-sm text-slate-200">
              Выбрано: <span className="font-semibold text-white">{bulkSelected.size}</span>
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setBulkAction('approve')} disabled={busy} className="rounded-lg bg-success-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-success-500 disabled:opacity-50">
                Approve all
              </button>
              <button onClick={() => setBulkAction('reject')} disabled={busy} className="btn-danger px-3 py-1.5 text-xs">
                Reject all
              </button>
              <button onClick={() => setBulkSelected(new Set())} disabled={busy} className="text-xs text-slate-400 hover:text-white">
                Отменить
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="card card-hud flex h-full flex-col items-center justify-center border-dashed">
            <EmptyState
              title="Заявок не найдено"
              description={tab === 'Pending' ? 'Новых заявок нет — все ворота закрыты' : 'Попробуйте изменить фильтры'}
              actionLabel={filtersActive ? 'Сбросить фильтры' : undefined}
              onAction={
                filtersActive
                  ? () => {
                      setSearch('')
                      setDateFilter('any')
                      setReviewer('any')
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((application) => {
              const isPending = application.status === 'Pending'
              return (
                <div key={application.id} className="card card-hover card-hud card-hud--sm flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                  {isPending && (
                    <input
                      type="checkbox"
                      checked={bulkSelected.has(application.id)}
                      onChange={() =>
                        setBulkSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(application.id)) {
                            next.delete(application.id)
                          } else {
                            next.add(application.id)
                          }
                          return next
                        })
                      }
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary-500"
                      aria-label={`Выбрать заявку ${application.username ?? application.id}`}
                    />
                  )}
                  <button
                    onClick={() => {
                      setSelected(application)
                      setModeratorComment('')
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {application.avatarUrl ? (
                      <img src={application.avatarUrl} alt="avatar" className="h-11 w-11 shrink-0 rounded-full border border-surface-700" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
                        {application.username?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{application.username ?? 'Неизвестный игрок'}</div>
                      <div className="truncate text-xs text-slate-400">
                        {application.steamId64} · {formatRelativeDate(application.createdAt)}
                      </div>
                    </div>
                  </button>
                  <div className={`badge shrink-0 ${STATUS_BADGE[application.status]}`}>{application.status}</div>
                  {isPending && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => setApproveFor(application)}
                        className="rounded-lg bg-success-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-success-500 active:scale-95"
                      >
                        Принять
                      </button>
                      <button
                        onClick={() =>
                          setRejectFor({ application, reason: REJECT_REASONS[0], comment: '' })
                        }
                        className="rounded-lg bg-danger-600 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-danger-500 active:scale-95"
                      >
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={selected !== null} title="Application" onClose={() => setSelected(null)}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {selected.avatarUrl ? (
                <img src={selected.avatarUrl} alt="avatar" className="h-14 w-14 rounded-full border border-surface-700" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-lg font-bold text-white">
                  {selected.username?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white">{selected.username ?? 'Неизвестный игрок'}</span>
                  <span className={`badge ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  SteamID64: {selected.steamId64}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-surface-700 bg-surface-950/60 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Joined Steam</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">—</div>
              </div>
              <div className="rounded-xl border border-surface-700 bg-surface-950/60 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Создана</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{new Date(selected.createdAt).toLocaleString('ru-RU')}</div>
              </div>
              <div className="rounded-xl border border-surface-700 bg-surface-950/60 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Steam profile</div>
                <a
                  href={steamProfileUrl(selected.steamId64)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-sm font-semibold text-primary-400 hover:underline"
                >
                  steamcommunity.com/profiles/{selected.steamId64}
                </a>
              </div>
            </div>

            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Comment</h4>
              <div className="rounded-xl border border-surface-700 bg-surface-950/60 px-3 py-2.5 text-sm text-slate-200">
                {selected.comment || 'Комментарий не указан'}
              </div>
            </div>

            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Previous applications</h4>
              <div className="rounded-xl border border-dashed border-surface-700 px-4 py-4 text-center text-xs text-slate-500">
                История предыдущих заявок недоступна
              </div>
            </div>

            <div className="rounded-xl border border-surface-700 bg-surface-950/60 px-3 py-2 text-xs text-slate-400">
              {selected.reviewedByUserId != null
                ? `Рассмотрено модератором #${selected.reviewedByUserId}${selected.reviewedAt ? ` · ${formatRelativeDate(selected.reviewedAt)}` : ''}`
                : 'Ещё не рассмотрена'}
            </div>

            {selected.status === 'Pending' && (
              <>
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Moderator comment</h4>
                  <textarea
                    value={moderatorComment}
                    onChange={(event) => setModeratorComment(event.target.value)}
                    placeholder="Комментарий модератора (будет виден кандидату)"
                    className="input w-full resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRejectFor({ application: selected, reason: REJECT_REASONS[0], comment: '' })}
                    className="btn-danger"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => void doReview(selected.id, 'Approved', moderatorComment || undefined)}
                    disabled={busy}
                    className="btn-primary bg-success-600 hover:bg-success-500"
                  >
                    Approve
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={approveFor !== null}
        title="Одобрить заявку?"
        description={approveFor ? `${approveFor.username ?? approveFor.steamId64} будет принят в клан.` : ''}
        tone="primary"
        confirmLabel="Одобрить"
        loading={busy}
        onConfirm={() => approveFor && void doReview(approveFor.id, 'Approved', moderatorComment || undefined)}
        onClose={() => setApproveFor(null)}
      >
        <input
          value={moderatorComment}
          onChange={(event) => setModeratorComment(event.target.value)}
          placeholder="Комментарий модератора (опционально)"
          className="input w-full"
        />
      </ConfirmModal>

      <ConfirmModal
        open={rejectFor !== null}
        title="Отклонить заявку"
        description={rejectFor ? `${rejectFor.application.username ?? rejectFor.application.steamId64}` : ''}
        confirmLabel="Отклонить"
        loading={busy}
        onConfirm={() => {
          if (!rejectFor) {
            return
          }
          const fullComment = [rejectFor.reason, rejectFor.comment].filter(Boolean).join(' — ')
          void doReview(rejectFor.application.id, 'Rejected', fullComment || undefined)
        }}
        onClose={() => setRejectFor(null)}
      >
        {rejectFor && (
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reason</label>
            {REJECT_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  rejectFor.reason === reason
                    ? 'border-danger-500/50 bg-danger-500/10 text-white'
                    : 'border-surface-700 text-slate-300 hover:bg-surface-800'
                }`}
              >
                <input
                  type="radio"
                  name="reject-reason"
                  checked={rejectFor.reason === reason}
                  onChange={() => setRejectFor({ ...rejectFor, reason })}
                  className="accent-danger-500"
                />
                {reason}
              </label>
            ))}
            <textarea
              value={rejectFor.comment}
              onChange={(event) => setRejectFor({ ...rejectFor, comment: event.target.value })}
              placeholder="Комментарий"
              className="input w-full resize-none"
              rows={2}
            />
          </div>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={bulkAction !== null}
        title={bulkAction === 'approve' ? 'Одобрить выбранные заявки?' : 'Отклонить выбранные заявки?'}
        description={`Будет обработано заявок: ${bulkSelected.size}`}
        tone={bulkAction === 'approve' ? 'primary' : 'danger'}
        confirmLabel={bulkAction === 'approve' ? 'Одобрить все' : 'Отклонить все'}
        loading={busy}
        onConfirm={() => bulkAction && void handleBulk(bulkAction === 'approve' ? 'Approved' : 'Rejected')}
        onClose={() => setBulkAction(null)}
      />
    </div>
  )
}
