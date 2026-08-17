import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartTheme } from '@/styles/chartTheme'

export interface ChartPoint {
  timestamp: string
  value: number
}

interface ChartProps {
  data: ChartPoint[]
  label: string
  height?: number
  color?: string
}

export default function Chart({ data, label, height = 280, color = '#60a5fa' }: ChartProps) {
  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
            axisLine={{ stroke: chartTheme.axisLine }}
            tickLine={false}
            tickFormatter={(value: string) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          />
          <YAxis tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
          <Tooltip
            cursor={{ stroke: chartTheme.cursorStroke, strokeDasharray: '3 3' }}
            contentStyle={{
              background: chartTheme.tooltip.background,
              border: chartTheme.tooltip.border,
              borderRadius: chartTheme.tooltip.borderRadius,
              boxShadow: chartTheme.tooltip.boxShadow,
              fontSize: chartTheme.tooltip.fontSize,
            }}
            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
            labelFormatter={(value) => new Date(value as string).toLocaleString('ru-RU')}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={label}
            stroke={color}
            strokeWidth={2.5}
            fill="url(#chartFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
