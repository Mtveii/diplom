import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  accent?: 'green' | 'blue' | 'amber' | 'red' | 'slate'
  icon?: ReactNode
  hint?: string
}

const accents: Record<NonNullable<StatCardProps['accent']>, { text: string; bar: string }> = {
  green: { text: 'text-success-400', bar: 'from-success-500 to-success-400' },
  blue: { text: 'text-primary-400', bar: 'from-primary-500 to-primary-400' },
  amber: { text: 'text-warning-400', bar: 'from-warning-500 to-warning-400' },
  red: { text: 'text-danger-400', bar: 'from-danger-500 to-danger-400' },
  slate: { text: 'text-slate-200', bar: 'from-slate-500 to-slate-300' },
}

export default function StatCard({ label, value, accent = 'slate', icon, hint }: StatCardProps) {
  const palette = accents[accent]
  return (
    <div className="card card-hover group relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${palette.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
          <div className={`mt-2 text-3xl font-bold tabular-nums ${palette.text}`}>{value}</div>
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
