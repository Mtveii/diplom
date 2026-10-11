import type { DeltaItem, ForecastDirection } from '@/utils/forecast'

const ARROW: Record<ForecastDirection, string> = { up: '▲', down: '▼', flat: '•' }

function formatCurrent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * Лаконічна строка «зараз → прогноз»: `120 → +8% ▲`. Вписується під графік
 * зліва, без слів (локалі не потрібні). Пустой список — не рендериться.
 */
export default function ForecastDeltaLine({ items }: { items: DeltaItem[] }) {
  if (items.length === 0) {
    return null
  }
  return (
    <p className="mt-1.5 text-[11px] text-slate-500">
      {items.map((item) => (
        <span key={`${item.color}-${item.current}`} className="mr-3 inline-flex items-center gap-1 last:mr-0">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="font-semibold text-slate-300">
            {formatCurrent(item.current)} → {item.percent > 0 ? '+' : ''}
            {item.percent}%
          </span>
          <span
            className={
              item.direction === 'up'
                ? 'text-success-400'
                : item.direction === 'down'
                  ? 'text-danger-400'
                  : 'text-slate-500'
            }
          >
            {ARROW[item.direction]}
          </span>
        </span>
      ))}
    </p>
  )
}
