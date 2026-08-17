import type { HeatmapPointDto } from '@/types/monitoring'

const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

interface HeatmapChartProps {
  data: HeatmapPointDto[]
}

/**
 * Heatmap активности: строки — дни недели, столбцы — часы.
 * Автоматически масштабируется на 100% ширины контейнера без горизонтальных скроллов.
 */
export default function HeatmapChart({ data }: HeatmapChartProps) {
  const max = Math.max(1, ...data.map((point) => point.activeCount))
  const byCell = new Map<string, number>()
  for (const point of data) {
    byCell.set(`${point.dayOfWeek}:${point.hour}`, point.activeCount)
  }

  const hours = Array.from({ length: 24 }, (_, h) => h)

  function cellColor(value: number): string {
    const intensity = value / max
    if (intensity <= 0) {
      return 'bg-surface-800/80 border border-surface-700/40'
    }
    if (intensity <= 0.25) {
      return 'bg-blue-950 border border-blue-900/50'
    }
    if (intensity <= 0.5) {
      return 'bg-blue-800'
    }
    if (intensity <= 0.75) {
      return 'bg-blue-600'
    }
    return 'bg-blue-400 shadow-glow'
  }

  return (
    <div className="card card-hud p-5 w-full">
      <div className="card-header-hud mb-4 flex-wrap">
        <h3 className="card-header-hud__title">Heatmap активности (когда клан в сети)</h3>
        <div className="card-header-hud__subtitle flex items-center gap-1.5 text-[10px]">
          <span className="rounded px-1.5 py-0.5 bg-surface-800 text-slate-400">0</span>
          <span className="rounded px-1.5 py-0.5 bg-blue-950 text-blue-300">25%</span>
          <span className="rounded px-1.5 py-0.5 bg-blue-800 text-blue-200">50%</span>
          <span className="rounded px-1.5 py-0.5 bg-blue-600 text-white">75%</span>
          <span className="rounded px-1.5 py-0.5 bg-blue-400 text-slate-950 font-semibold">100%</span>
        </div>
      </div>
      <div className="w-full">
        <div className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-1 items-center mb-1.5">
          <div />
          {hours.map((hour) => (
            <div key={hour} className="text-center text-[9px] text-slate-500 font-mono truncate">
              {hour % 3 === 0 ? hour : ''}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {daysOfWeek.map((day, dayIndex) => (
            <div key={day} className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-1 items-center">
              <div className="text-xs font-medium text-slate-400">{day}</div>
              {hours.map((hour) => {
                const value = byCell.get(`${dayIndex}:${hour}`) ?? 0
                const title = `${day} ${hour}:00 — активных: ${value}`
                return (
                  <div
                    key={hour}
                    title={title}
                    className={`heatmap-cell h-5 rounded-[4px] transition-transform hover:scale-125 ${cellColor(value)} ${
                      value / max > 0.5 ? 'hud-cell-hot' : ''
                    }`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
