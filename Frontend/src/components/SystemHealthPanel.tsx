import { useCallback, useEffect, useState } from 'react'
import { healthApi } from '@/services/api/health.api'
import type { SystemHealthDto } from '@/types/health'

export default function SystemHealthPanel() {
  const [health, setHealth] = useState<SystemHealthDto | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = useCallback(async () => {
    try {
      const data = await healthApi.getHealth()
      setHealth(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchHealth()
    const timer = setInterval(() => void fetchHealth(), 30_000)
    return () => clearInterval(timer)
  }, [fetchHealth])

  if (loading && !health) {
    return (
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Системный мониторинг</h3>
        <div className="text-xs text-slate-500">Загрузка статуса инфраструктуры...</div>
      </div>
    )
  }

  const isHealthy = health?.status === 'Healthy'

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Системный мониторинг инфраструктуры</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Версия: <span className="text-slate-200">{health?.version ?? '1.0.0'}</span> · Uptime: <span className="text-slate-200">{health?.uptime ?? 'N/A'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isHealthy ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-success-400 animate-pulse' : 'bg-danger-400'}`} />
            {health?.status ?? 'Unknown'}
          </span>
          <button
            onClick={() => void fetchHealth()}
            className="btn-ghost px-2.5 py-1 text-xs"
            title="Обновить статус"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.73-5.73" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {health?.components.map((comp) => (
          <div
            key={comp.name}
            className={`rounded-xl border p-3.5 transition-all ${
              comp.healthy
                ? 'border-surface-700 bg-surface-800/40'
                : 'border-danger-500/40 bg-danger-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">{comp.name}</span>
              <span className={`h-2 w-2 rounded-full ${comp.healthy ? 'bg-success-400' : 'bg-danger-400'}`} />
            </div>
            <div className="mt-2 text-sm font-medium text-white truncate" title={comp.message}>
              {comp.message}
            </div>
            {comp.latencyMs !== null && (
              <div className="mt-1 text-[11px] tabular-nums text-slate-500">
                Задержка: {comp.latencyMs} мс
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
