import DonutChart from './DonutChart'
import StatCard from './StatCard'
import type { DonutChartItem } from './DonutChart'

interface MemberStatsHeaderProps {
  counts: {
    online: number
    inGame: number
    restricted: number
    total: number
  }
  statuses: DonutChartItem[]
}

export default function MemberStatsHeader({ counts, statuses }: MemberStatsHeaderProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard
        label="Онлайн сейчас"
        value={counts.online}
        accent="green"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
        }
      />
      <StatCard
        label="В игре"
        value={counts.inGame}
        accent="blue"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 12h.01" />
            <path d="M10 12h.01" />
          </svg>
        }
      />
      <StatCard
        label="Мут / бан"
        value={counts.restricted}
        accent="amber"
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
          </svg>
        }
      />
      <div className="card card-hud card-hud--sm flex flex-col items-center justify-center gap-2 p-4">
        <div className="text-xs font-semibold text-slate-300">Статусы</div>
        {statuses.length === 0 ? (
          <div className="py-6 text-xs text-slate-500">Нет данных</div>
        ) : (
          <DonutChart data={statuses} size={104} showLegend={false} />
        )}
      </div>
    </div>
  )
}
