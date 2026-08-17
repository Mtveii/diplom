import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { chartTheme } from '@/styles/chartTheme'

export interface DonutChartItem {
  name: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutChartItem[]
  label?: string
  size?: number
  showLegend?: boolean
  centerValue?: string | number | null
  centerLabel?: string
}

const tooltipStyle = {
  background: chartTheme.tooltip.background,
  border: chartTheme.tooltip.border,
  borderRadius: chartTheme.tooltip.borderRadius,
  boxShadow: chartTheme.tooltip.boxShadow,
  fontSize: chartTheme.tooltip.fontSize,
}

export default function DonutChart({
  data,
  label,
  size = 160,
  showLegend = true,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [`${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, name]}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="68%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
            isAnimationActive
          >
            {data.map((item) => (
              <Cell key={item.name} fill={item.color} />
            ))}
          </Pie>
        </PieChart>
        {(centerValue != null || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {centerValue != null && <div className="text-lg font-bold text-white">{centerValue}</div>}
            {centerLabel && <div className="px-2 text-center text-[10px] text-slate-500">{centerLabel}</div>}
          </div>
        )}
      </div>

      {showLegend && data.length > 0 && (
        <div className="flex w-full flex-col gap-1.5 sm:w-auto">
          {data.map((item) => (
            <div key={item.name} className="flex min-w-40 items-center justify-between gap-4 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-slate-300">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-100">
                {item.value}
                {label && <span className="ml-0.5 text-[10px] font-normal text-slate-500">{label}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}