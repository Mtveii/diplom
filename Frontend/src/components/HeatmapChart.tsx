import type { HeatmapPointDto } from '@/types/monitoring'

const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

interface HeatmapChartProps {
  data: HeatmapPointDto[]
}

/**
 * Heatmap активности: строки — дни недели, столбцы — часы.
 * Интенсивность заливается по шкале от slate до emerald.
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
      return 'bg-surface-800/80'
    }
    if (intensity <= 0.25) {
      return 'bg-emerald-900'
    }
    if (intensity <= 0.5) {
      return 'bg-emerald-700'
    }
    if (intensity <= 0.75) {
      return 'bg-emerald-500'
    }
    return 'bg-emerald-300'
  }

  return (
    <div className="card overflow-x-auto p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Heatmap активности (когда клан в сети)</h3>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <span className="rounded-sm bg-surface-800 px-1.5 py-0.5">0</span>
          <span className="rounded-sm bg-emerald-900 px-1.5 py-0.5">25%</span>
          <span className="rounded-sm bg-emerald-700 px-1.5 py-0.5">50%</span>
          <span className="rounded-sm bg-emerald-500 px-1.5 py-0.5">75%</span>
          <span className="rounded-sm bg-emerald-300 px-1.5 py-0.5">100%</span>
        </div>
      </div>
      <div className="min-w-[760px]">
        <div className="flex">
          <div className="w-9" />
          {hours.map((hour) => (
            <div key={hour} className="w-5 text-center text-[9px] text-slate-500">
              {hour}
            </div>
          ))}
        </div>
        {daysOfWeek.map((day, dayIndex) => (
          <div key={day} className="flex items-center">
            <div className="w-9 text-xs text-slate-400">{day}</div>
            {hours.map((hour) => {
              const value = byCell.get(`${dayIndex}:${hour}`) ?? 0
              const title = `${day} ${hour}:00 — активных: ${value}`
              return (
                <div
                  key={hour}
                  title={title}
                  className={`m-px h-[17px] w-[17px] rounded-[4px] transition-transform hover:scale-125 ${cellColor(value)}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
