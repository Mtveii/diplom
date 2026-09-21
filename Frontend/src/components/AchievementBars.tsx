import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartTheme } from '@/styles/chartTheme'
import { useLocale } from '@/hooks/useLocale'
import type { AchievementComparisonDto } from '@/types/monitoring'

interface AchievementBarsProps {
  achievements: AchievementComparisonDto[]
  limit?: number
}

const MAX_LABEL = 20

export default function AchievementBars({ achievements, limit = 10 }: AchievementBarsProps) {
  const { t } = useLocale()

  const data = [...achievements]
    .sort((a, b) => b.clanUnlockPercent - a.clanUnlockPercent)
    .slice(0, limit)
    .map((achievement) => ({
      name: (achievement.name ?? achievement.achievementId).slice(0, MAX_LABEL),
      ours: Number(achievement.clanUnlockPercent.toFixed(1)),
      global: achievement.globalUnlockPercent != null ? Number(achievement.globalUnlockPercent.toFixed(1)) : 0,
    }))

  if (data.length === 0) {
    return null
  }

  return (
    <div className="mb-5">
      <div className="card-header-hud mb-3">
        <h4 className="card-header-hud__title text-sm">{t.achievements.barsTitle}</h4>
      </div>
      <div style={{ height: Math.max(200, data.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#172554', opacity: 0.4 }}
              contentStyle={{
                background: chartTheme.tooltip.background,
                border: chartTheme.tooltip.border,
                borderRadius: chartTheme.tooltip.borderRadius,
                boxShadow: chartTheme.tooltip.boxShadow,
                fontSize: chartTheme.tooltip.fontSize,
              }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ours" name={t.achievements.seriesOurs} fill="#34d399" radius={[0, 6, 6, 0]} barSize={10} />
            <Bar dataKey="global" name={t.achievements.seriesGlobal} fill="#60a5fa" radius={[0, 6, 6, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
