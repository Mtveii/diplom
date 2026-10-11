import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartTheme } from '@/styles/chartTheme'
import { useLocale } from '@/hooks/useLocale'
import { useForecastStore } from '@/store/forecastStore'
import { formatDayMonth } from '@/utils/format'
import { SHOW_ALL_MIN_R2, buildSeriesForecast, deltaForSeries, withForecastRange } from '@/utils/forecast'
import { renderForecastOverlay } from '@/components/ForecastOverlay'
import ForecastToggle, { ForecastNote } from '@/components/ForecastToggle'
import ForecastDeltaLine from '@/components/ForecastDeltaLine'

interface GameMonitorTrendChartProps {
  alertsByDay: Array<{ day: string; iso: string; count: number }>
}

export default function GameMonitorTrendChart({ alertsByDay }: GameMonitorTrendChartProps) {
  const { t, locale } = useLocale()
  const globalForecast = useForecastStore((state) => state.enabled)
  const [localForecast, setLocalForecast] = useState(true)
  const showForecast = globalForecast && localForecast

  const forecast = useMemo(() => {
    if (!showForecast || alertsByDay.length < 2) {
      return null
    }
    return buildSeriesForecast({
      values: alertsByDay.map((item) => item.count),
      times: alertsByDay.map((item) => new Date(`${item.iso}T00:00:00Z`).getTime()),
      label: t.trend.series,
      color: '#3b82f6',
      min: 0,
      minR2: SHOW_ALL_MIN_R2,
    })
  }, [showForecast, alertsByDay, t])

  const rows = useMemo(
    () =>
      withForecastRange(alertsByDay, 'day', 'countF', forecast, (iso) =>
        formatDayMonth(new Date(iso), locale),
      ),
    [alertsByDay, forecast, locale],
  )
  const from = forecast && alertsByDay.length > 0 ? alertsByDay[alertsByDay.length - 1].day : null
  const hasData = !alertsByDay.every((item) => item.count === 0)

  const delta = useMemo(() => {
    if (!showForecast || !hasData || alertsByDay.length < 2) {
      return null
    }
    return deltaForSeries(
      alertsByDay.map((item) => item.count),
      alertsByDay.map((item) => new Date(`${item.iso}T00:00:00Z`).getTime()),
      '#3b82f6',
      { min: 0, minR2: SHOW_ALL_MIN_R2 },
    )
  }, [showForecast, hasData, alertsByDay])

  return (
    <div className="card card-hud p-5">
      <div className="card-header-hud">
        <h3 className="card-header-hud__title">{t.trend.title}</h3>
        {hasData && (
          <span className="ml-auto">
            <ForecastToggle
              enabled={showForecast}
              onToggle={() => setLocalForecast((prev) => !prev)}
              disabled={alertsByDay.length < 2}
              disabledReason={t.forecast.needData}
            />
          </span>
        )}
      </div>
      {!hasData ? (
        <div className="rounded-xl border border-dashed border-surface-700 px-4 py-6 text-center text-xs text-slate-500">
          {t.trend.empty}
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
              <Bar dataKey="count" name={t.trend.series} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              {renderForecastOverlay(
                forecast ? [{ key: 'countF', label: t.trend.series, color: '#3b82f6' }] : [],
                from,
                t.forecast.suffix,
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <ForecastNote visible={showForecast && hasData && !forecast} />
      <ForecastDeltaLine items={delta ? [delta] : []} />
    </div>
  )
}
