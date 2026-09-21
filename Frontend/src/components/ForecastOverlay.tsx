import { Fragment } from 'react'
import { Area, Line, ReferenceLine } from 'recharts'
import { chartTheme } from '@/styles/chartTheme'
import { useLocale } from '@/hooks/useLocale'
import type { AppliedForecast } from '@/utils/forecast'

interface ForecastOverlayProps {
  applied: AppliedForecast[]
  /** Мітки осі X останньої історичної точки — межа «факт / прогноз». */
  from: string | null
}

/**
 * Візуальне відокремлення прогнозу: пунктир + напівпрозорий коридор +
 * сіра межа «зараз» + окремий запис у легенді.
 */
export default function ForecastOverlay({ applied, from }: ForecastOverlayProps) {
  const { t } = useLocale()
  if (applied.length === 0) {
    return null
  }
  return (
    <>
      {applied.map((spec) => (
        <Fragment key={spec.key}>
          <Area
            yAxisId={spec.axis}
            type="monotone"
            dataKey={`${spec.key}Range`}
            legendType="none"
            stroke="none"
            fill={spec.color}
            fillOpacity={0.12}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            yAxisId={spec.axis}
            type="monotone"
            dataKey={spec.key}
            name={`${spec.label} — ${t.forecast.suffix}`}
            stroke={spec.color}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
          />
        </Fragment>
      ))}
      {from && <ReferenceLine x={from} stroke={chartTheme.axisLine} strokeDasharray="4 4" />}
    </>
  )
}
