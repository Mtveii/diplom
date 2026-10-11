import { Area, Line, ReferenceLine } from 'recharts'
import { chartTheme } from '@/styles/chartTheme'
import type { AppliedForecast } from '@/utils/forecast'

/**
 * Оверлей прогнозу: пунктир + коридор + межа «зараз».
 *
 * ВАЖЛИВО: це НЕ React-компонент, а функція, що повертає масив элементов.
 * Recharts аналізує дітей чарту статично (findAllByType) і НЕ бачить
 * графічні примітиви всередині кастомних компонентів — обгортка-компонент
 * мовчки викидається без помилок. Тому тільки inline-масив напряму в чарт.
 * Чарт-батько зобов'язаний бути ComposedChart (однотипні чарты так само
 * викидають чужі серії).
 */
export function renderForecastOverlay(
  applied: AppliedForecast[],
  from: string | null,
  suffix: string,
): React.ReactNode[] {
  if (applied.length === 0) {
    return []
  }
  return [
    ...applied.flatMap((spec) => [
      <Area
        key={`${spec.key}-range`}
        yAxisId={spec.axis}
        type="monotone"
        dataKey={`${spec.key}Range`}
        legendType="none"
        stroke="none"
        fill={spec.color}
        fillOpacity={0.12}
        connectNulls
        isAnimationActive={false}
      />,
      <Line
        key={`${spec.key}-line`}
        yAxisId={spec.axis}
        type="linear"
        dataKey={spec.key}
        name={`${spec.label} — ${suffix}`}
        stroke={spec.color}
        strokeWidth={2}
        strokeDasharray="6 4"
        dot={false}
        connectNulls
      />,
    ]),
    ...(from
      ? [
          <ReferenceLine
            key="forecast-now"
            x={from}
            stroke={chartTheme.axisLine}
            strokeDasharray="4 4"
          />,
        ]
      : []),
  ]
}
