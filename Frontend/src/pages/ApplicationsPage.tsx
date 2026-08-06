import { useCallback, useEffect, useState } from 'react'
import ErrorState from '@/components/ErrorState'
import Spinner from '@/components/Spinner'
import { applicationsApi } from '@/services/api/members.api'
import type { MembershipApplicationDto } from '@/types/member'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<MembershipApplicationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newSteamId, setNewSteamId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setApplications(await applicationsApi.getAll())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleSubmit = async () => {
    setMessage(null)
    try {
      await applicationsApi.submit(newSteamId)
      setNewSteamId('')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось подать заявку')
    }
  }

  const handleReview = async (id: number, decision: 'Approved' | 'Rejected') => {
    const comment = window.prompt(
      decision === 'Approved' ? 'Комментарий модератора (опционально):' : 'Причина отклонения:',
    )
    if (comment === null) {
      return
    }
    await applicationsApi.review(id, decision, comment || undefined)
    await reload()
  }

  if (loading) {
    return <Spinner />
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-white">Заявки на вступление</h1>
        <p className="mt-0.5 text-sm text-slate-400">Рассмотрение кандидатов на вступление в клан</p>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
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
      {message && (
        <div className="rounded-xl border border-surface-700 bg-surface-800/60 px-3 py-2 text-xs text-slate-300">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {applications.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 border-dashed border-surface-700 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-700 bg-surface-800/60 text-slate-400">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M12 18v-6" />
                <path d="M9 15h6" />
              </svg>
            </div>
            <div className="text-sm text-slate-400">Заявок нет — все ворота закрыты</div>
          </div>
        ) : (
          applications.map((application) => (
            <div
              key={application.id}
              className="card card-hover flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
            >
              {application.avatarUrl ? (
                <img src={application.avatarUrl} alt="avatar" className="h-11 w-11 rounded-full border border-surface-700" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
                  {application.username?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">{application.username ?? 'Неизвестный игрок'}</div>
                <div className="text-xs text-slate-400">
                  {application.steamId64} · {new Date(application.createdAt).toLocaleString('ru-RU')}
                </div>
                {application.comment && (
                  <div className="mt-1 text-xs text-slate-300">Комментарий: {application.comment}</div>
                )}
              </div>
              <div
                className={`badge ${
                  application.status === 'Pending'
                    ? 'bg-warning-500/15 text-warning-400'
                    : application.status === 'Approved'
                      ? 'bg-success-500/15 text-success-400'
                      : 'bg-danger-500/15 text-danger-400'
                }`}
              >
                {application.status}
              </div>
              {application.status === 'Pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleReview(application.id, 'Approved')}
                    className="rounded-lg bg-success-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-success-500 active:scale-95"
                  >
                    Принять
                  </button>
                  <button
                    onClick={() => void handleReview(application.id, 'Rejected')}
                    className="rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-danger-500 active:scale-95"
                  >
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}