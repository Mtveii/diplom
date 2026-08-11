import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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

export default function Chart({ data, label, height = 280, color = '#2dd4bf' }: ChartProps) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          активность
        </div>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#16404f" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#16404f' }}
              tickLine={false}
              tickFormatter={(value: string) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
            <Tooltip
              cursor={{ stroke: '#16404f', strokeDasharray: '3 3' }}
              contentStyle={{
                background: '#0b2732',
                border: '1px solid #16404f',
                borderRadius: 12,
                boxShadow: '0 12px 30px -10px rgba(4,20,26,0.9)',
                fontSize: 12,
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
              labelFormatter={(value) => new Date(value as string).toLocaleString('ru-RU')}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Онлайн"
              stroke={color}
              strokeWidth={2.5}
              fill="url(#chartFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
