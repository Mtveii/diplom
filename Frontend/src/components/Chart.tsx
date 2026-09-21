import { Fragment } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartTheme } from '@/styles/chartTheme'
import { useLocale } from '@/hooks/useLocale'
import { formatDayMonth, formatFullDateTime } from '@/utils/format'

export interface ChartPoint {
  timestamp: string
  value: number
}

export interface ChartSecondarySeries {
  data: ChartPoint[]
  label: string
  color?: string
}

export interface ChartForecastPoint {
  timestamp: string
  value: number
  lower: number
  upper: number
}

export interface ChartForecast {
  /** Ключ исторической серии: 'value' или 'value2'. */
  target: string
  label: string
  color: string
  /** ISO-метка последней исторической точки — межа «факт / прогноз». */
  from: string
  points: ChartForecastPoint[]
}

interface ChartProps {
  data: ChartPoint[]
  label: string
  height?: number
  color?: string
  /** Вторая серия (например, «Новые аккаунты») на общей оси времени. */
  secondary?: ChartSecondarySeries
  /** Прогнозы: пунктир + коридор, визуально отличные от факта. */
  forecasts?: ChartForecast[]
}

interface ChartRow {
  timestamp: string
  value: number | null
  value2: number | null
  [extra: string]: string | number | [number, number] | null
}

/** Объединяет серии и прогнозы по оси времени; в точках без значения ставит null. */
function mergeSeries(primary: ChartPoint[], secondary: ChartPoint[] | undefined, forecasts: ChartForecast[]): ChartRow[] {
  const primaryByTime = new Map(primary.map((point) => [point.timestamp, point.value]))
  const secondaryByTime = new Map((secondary ?? []).map((point) => [point.timestamp, point.value]))
  const forecastByTarget = new Map(forecasts.map((f) => [f.target, new Map(f.points.map((p) => [p.timestamp, p]))]))
  const times = new Set<string>([...primaryByTime.keys(), ...secondaryByTime.keys()])
  for (const byTime of forecastByTarget.values()) {
    for (const timestamp of byTime.keys()) {
      times.add(timestamp)
    }
  }
  return [...times]
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map((timestamp) => {
      const row: ChartRow = {
        timestamp,
        value: primaryByTime.get(timestamp) ?? null,
        value2: secondaryByTime.get(timestamp) ?? null,
      }
      for (const [target, byTime] of forecastByTarget) {
        const point = byTime.get(timestamp)
        row[`${target}F`] = point?.value ?? null
        row[`${target}FRange`] = point ? [point.lower, point.upper] : null
      }
      return row
    })
}

function formatBand(value: [number, number]): string {
  const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1))
  return `${fmt(value[0])}–${fmt(value[1])}`
}

export default function Chart({ data, label, height = 280, color = '#60a5fa', secondary, forecasts = [] }: ChartProps) {
  const { locale, t } = useLocale()
  const secondaryColor = secondary?.color ?? '#f59e0b'
  const rows = mergeSeries(data, secondary?.data, forecasts)
  const forecastFrom = forecasts.length > 0 ? forecasts[0].from : null

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="chartFillSecondary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
            axisLine={{ stroke: chartTheme.axisLine }}
            tickLine={false}
            tickFormatter={(value: string) => formatDayMonth(value, locale)}
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
            labelFormatter={(value) => formatFullDateTime(value as string, locale)}
            formatter={(value, name) => (Array.isArray(value) ? [formatBand(value as [number, number]), name] : [value, name])}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="value"
            name={label}
            stroke={color}
            strokeWidth={2.5}
            fill="url(#chartFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls
          />
          {secondary && (
            <Area
              type="monotone"
              dataKey="value2"
              name={secondary.label}
              stroke={secondaryColor}
              strokeWidth={2}
              strokeDasharray="5 3"
              fill="url(#chartFillSecondary)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          )}
          {forecasts.map((forecast) => (
            <Fragment key={forecast.target}>
              <Area
                type="monotone"
                dataKey={`${forecast.target}FRange`}
                legendType="none"
                stroke="none"
                fill={forecast.color}
                fillOpacity={0.12}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey={`${forecast.target}F`}
                name={`${forecast.label} — ${t.forecast.suffix}`}
                stroke={forecast.color}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            </Fragment>
          ))}
          {forecastFrom && (
            <ReferenceLine x={forecastFrom} stroke={chartTheme.axisLine} strokeDasharray="4 4" />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
