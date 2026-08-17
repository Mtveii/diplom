import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartTheme } from '@/styles/chartTheme'

interface GameMonitorTrendChartProps {
  alertsByDay: Array<{ day: string; count: number }>
}

export default function GameMonitorTrendChart({ alertsByDay }: GameMonitorTrendChartProps) {
  return (
    <div className="card card-hud p-5">
      <div className="card-header-hud">
        <h3 className="card-header-hud__title">Срабатывания алертов за 14 дней</h3>
      </div>
      {alertsByDay.every((item) => item.count === 0) ? (
        <div className="rounded-xl border border-dashed border-surface-700 px-4 py-6 text-center text-xs text-slate-500">
          За последние 14 дней алертов не зафиксировано
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={alertsByDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: chartTheme.axisTick, fontSize: 10 }} axisLine={{ stroke: chartTheme.axisLine }} tickLine={false} />
              <YAxis tick={{ fill: chartTheme.axisTick, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: '#272a37', opacity: 0.4 }}
                contentStyle={{
                  background: chartTheme.tooltip.background,
                  border: chartTheme.tooltip.border,
                  borderRadius: chartTheme.tooltip.borderRadius,
                  boxShadow: chartTheme.tooltip.boxShadow,
                  fontSize: chartTheme.tooltip.fontSize,
                }}
              />
              <Bar dataKey="count" name="Алерты" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
