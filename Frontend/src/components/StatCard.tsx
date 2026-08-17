import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  accent?: 'green' | 'blue' | 'amber' | 'red' | 'slate'
  icon?: ReactNode
  hint?: string
  delta?: number | null
}

const accents: Record<NonNullable<StatCardProps['accent']>, { text: string; bar: string }> = {
  green: { text: 'text-success-400', bar: 'from-success-500 to-success-400' },
  blue: { text: 'text-primary-400', bar: 'from-primary-500 to-primary-400' },
  amber: { text: 'text-warning-400', bar: 'from-warning-500 to-warning-400' },
  red: { text: 'text-danger-400', bar: 'from-danger-500 to-danger-400' },
  slate: { text: 'text-slate-200', bar: 'from-slate-500 to-slate-300' },
}

export default function StatCard({ label, value, accent = 'slate', icon, hint, delta }: StatCardProps) {
  const palette = accents[accent]
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta)
  return (
    <div className="card card-hover card-hud group relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${palette.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
          <div className={`mt-2 text-3xl font-bold tabular-nums ${palette.text}`}>{value}</div>
          {hasDelta && delta !== 0 && (
            <div
              className={`mt-1.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${
                delta! > 0
                  ? 'border-success-500/40 bg-transparent text-success-400 shadow-[0_0_12px_-2px_rgba(52,211,153,0.5)]'
                  : 'border-danger-500/40 bg-transparent text-danger-400 shadow-[0_0_12px_-2px_rgba(239,68,68,0.45)]'
              }`}
              title="к прошлому периоду"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {delta! >= 0 ? <path d="M7 17L17 7" /> : <path d="M7 7l10 10" />}
                {delta! >= 0 ? (
                  <path d="M7 7h10v10" />
                ) : (
                  <path d="M17 7v10H7" />
                )}
              </svg>
              {delta! > 0 ? '+' : ''}
              {delta!.toFixed(1)}%
            </div>
          )}
          {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
        </div>
        {icon && (
          <div className={`rounded-xl border border-surface-700 bg-surface-800/50 p-2.5 ${palette.text}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
