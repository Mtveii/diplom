import { useCallback, useEffect, useMemo, useState } from 'react'
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
import ErrorState from '@/components/ErrorState'
import Modal from '@/components/Modal'
import Spinner from '@/components/Spinner'
import { analyticsApi } from '@/services/api/analytics.api'
import { toast } from '@/store/toastStore'
import type { ChurnRiskDto, CohortRowDto, PeriodComparisonDto, RetentionPointDto } from '@/types/analytics'

type RangeDays = 7 | 30 | 90
type RetentionHorizon = 7 | 30 | 90
type ChurnThreshold = 7 | 14 | 30
type CohortMetric = 'retention' | 'churn'
type ExportFormat = 'Pdf' | 'Excel'

const RANGES: Array<{ value: RangeDays; label: string }> = [
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
]

const RETENTION_HORIZONS: RetentionHorizon[] = [7, 30, 90]
const CHURN_THRESHOLDS: ChurnThreshold[] = [7, 14, 30]
const COHORT_DAYS = [7, 30, 90] as const

const changeBadge = (value: number) => {
  const color = value >= 0 ? 'text-emerald-400' : 'text-rose-400'
  return <span className={`font-semibold ${color}`}>{value >= 0 ? '+' : ''}{value.toFixed(1)}%</span>
}

export default function AnalyticsPage() {
  const [retention, setRetention] = useState<RetentionPointDto[]>([])
  const [cohorts, setCohorts] = useState<CohortRowDto[]>([])
  const [churn, setChurn] = useState<ChurnRiskDto[]>([])
  const [comparison, setComparison] = useState<PeriodComparisonDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [range, setRange] = useState<RangeDays>(7)
  const [retentionDays, setRetentionDays] = useState<RetentionHorizon>(90)
  const [churnThreshold, setChurnThreshold] = useState<ChurnThreshold>(14)
  const [highRiskOnly, setHighRiskOnly] = useState(false)
  const [cohortMetric, setCohortMetric] = useState<CohortMetric>('retention')

  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('Excel')
  const [exportRange, setExportRange] = useState<RangeDays>(7)
  const [exporting, setExporting] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ret, ch, cmp, cols] = await Promise.all([
        analyticsApi.retention(retentionDays),
        analyticsApi.churn(churnThreshold),
        analyticsApi.compare(range),
        analyticsApi.cohorts(6),
      ])
      setRetention(ret)
      setChurn(ch)
      setComparison(cmp)
      setCohorts(cols)
    } catch {
      setError('Не удалось загрузить данные аналитики')
    } finally {
      setLoading(false)
    }
  }, [retentionDays, churnThreshold, range])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredChurn = useMemo(
    () => (highRiskOnly ? churn.filter((member) => member.riskScore >= 0.5) : churn),
    [churn, highRiskOnly],
  )

  const rangeLabel = range === 7 ? 'неделю' : `${range} дней`

  const handleExport = async () => {
    setExporting(true)
    try {
      const to = new Date()
      const from = new Date(Date.now() - exportRange * 24 * 3600_000)
      await analyticsApi.export(exportFormat, from, to)
      toast.success('Отчёт сформирован и скачан')
      setExportOpen(false)
    } catch {
      toast.error('Не удалось сформировать отчёт')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <Spinner label="Загрузка аналитики..." fullPage />
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void reload()} />
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Аналитика клана</h1>
          <p className="mt-0.5 text-sm text-slate-400">Retention, отток и когорты участников</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Период сравнения:</span>
            <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-900 p-1">
              {RANGES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRange(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    range === option.value
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow'
                      : 'text-slate-400 hover:bg-surface-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setExportOpen(true)} className="btn-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Экспорт отчёта
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="flex flex-col gap-6">
      {comparison && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card card-hover relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Активные игроки (за {rangeLabel})
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-white">
              {comparison.currentActivePlayers}{' '}
              <span className="text-sm font-normal text-slate-500">vs {comparison.previousActivePlayers}</span>
            </div>
            <div className="mt-1 text-sm">{changeBadge(comparison.activePlayersChangePercent)}</div>
          </div>
          <div className="card card-hover relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-success-500 to-success-400" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Playtime (за {rangeLabel})
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-white">
              {(comparison.currentPlaytimeMinutes / 60).toFixed(0)} ч
            </div>
            <div className="mt-1 text-sm">{changeBadge(comparison.playtimeChangePercent)}</div>
          </div>
          <div className="card card-hover relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent-500 to-accent-400" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Средний онлайн (за {rangeLabel})
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-white">
              {comparison.currentAverageDailyOnline.toFixed(1)}
            </div>
            <div className="mt-1 text-sm">{changeBadge(comparison.averageOnlineChangePercent)}</div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Retention (горизонт {retentionDays} дней)
            </h3>
            <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-900 p-1">
              {RETENTION_HORIZONS.map((days) => (
                <button
                  key={days}
                  onClick={() => setRetentionDays(days)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                    retentionDays === days
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow'
                      : 'text-slate-400 hover:bg-surface-800'
                  }`}
                >
                  {days} дн
                </button>
              ))}
            </div>
          </div>
          {retention.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 px-4 py-10 text-center text-sm text-slate-500">
              Нет данных за выбранный горизонт — джоба сбора активности ещё не отработала
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={retention.map((point) => ({ day: `День ${point.day}`, retained: point.retainedPercent }))}>
                <defs>
                  <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#16404f" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#16404f' }} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#16404f', opacity: 0.4 }}
                  contentStyle={{
                    background: '#0b2732',
                    border: '1px solid #16404f',
                    borderRadius: 12,
                    boxShadow: '0 12px 30px -10px rgba(4,20,26,0.9)',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="retained" name="Активных, %" fill="url(#retentionFill)" radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-200">Риск оттока (churn)</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                <button
                  type="button"
                  role="switch"
                  aria-checked={highRiskOnly}
                  onClick={() => setHighRiskOnly((value) => !value)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    highRiskOnly ? 'bg-primary-500' : 'bg-surface-700'
                  }`}
                  title="Показывать только участников с риском ≥ 50%"
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      highRiskOnly ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
                High risk only
              </label>
              <select
                value={churnThreshold}
                onChange={(event) => setChurnThreshold(Number(event.target.value) as ChurnThreshold)}
                className="input h-9 bg-surface-950 px-2 text-xs"
              >
                {CHURN_THRESHOLDS.map((days) => (
                  <option key={days} value={days}>
                    без входа {days}+ дней
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {filteredChurn.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
                {highRiskOnly
                  ? 'Участников с высоким риском оттока нет'
                  : 'Риск оттока не обнаружен — участники активны'}
              </div>
            ) : (
              filteredChurn.map((member) => (
                <div key={member.steamId64} className="flex items-center gap-3 text-sm">
                  <div className="flex-1">
                    <div className="text-slate-100">{member.username}</div>
                    <div className="text-xs text-slate-500">не в сети {member.daysWithoutLogin} дней</div>
                  </div>
                  <div className="w-32">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-warning-500 to-danger-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, member.riskScore * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-300">
                    {Math.round(member.riskScore * 100)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-200">Когортный анализ (по месяцу вступления)</h3>
          <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-900 p-1">
            <button
              onClick={() => setCohortMetric('retention')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                cohortMetric === 'retention'
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow'
                  : 'text-slate-400 hover:bg-surface-800'
              }`}
            >
              Активных, %
            </button>
            <button
              onClick={() => setCohortMetric('churn')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                cohortMetric === 'churn'
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow'
                  : 'text-slate-400 hover:bg-surface-800'
              }`}
            >
              Покинули, %
            </button>
          </div>
        </div>
        {cohorts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-700 px-4 py-10 text-center text-sm text-slate-500">
            Когортных данных пока нет — джоба сбора активности ещё не отработала
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="pb-2">Когорта</th>
                  <th className="pb-2">Размер</th>
                  {COHORT_DAYS.map((day) => (
                    <th key={day} className="pb-2">
                      {cohortMetric === 'retention' ? `Retention ${day}d, %` : `Покинули к ${day}d, %`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {cohorts.map((cohort) => (
                  <tr key={cohort.cohortMonth} className="border-t border-surface-700/60 transition-colors hover:bg-surface-800/40">
                    <td className="py-2 font-medium text-slate-100">{cohort.cohortMonth}</td>
                    <td className="py-2">{cohort.cohortSize}</td>
                    {COHORT_DAYS.map((day) => {
                      const point = cohort.points.find((p) => p.day === day)
                      const value = point ? (cohortMetric === 'retention' ? point.retainedPercent : 100 - point.retainedPercent) : null
                      return <td key={day} className="py-2">{value != null ? `${value.toFixed(1)}%` : '—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      </div>

      <Modal open={exportOpen} title="Экспорт отчёта" onClose={() => setExportOpen(false)}>
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Формат</div>
            <div className="grid grid-cols-2 gap-3">
              {(['Pdf', 'Excel'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                    exportFormat === format
                      ? 'border-primary-400 bg-primary-500/10'
                      : 'border-surface-700 bg-surface-800/40 hover:bg-surface-800'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                      exportFormat === format ? 'bg-primary-500 text-surface-950' : 'bg-surface-700 text-slate-300'
                    }`}
                  >
                    {format === 'Pdf' ? 'PDF' : 'XLSX'}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-100">
                      {format === 'Pdf' ? 'PDF' : 'Excel'}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {format === 'Pdf' ? 'полный отчёт' : 'таблицы с метриками'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Период отчёта</div>
            <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-900 p-1">
              {RANGES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setExportRange(option.value)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    exportRange === option.value
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow'
                      : 'text-slate-400 hover:bg-surface-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Отчёт покроет данные за последние {exportRange} дней (с {new Date(Date.now() - exportRange * 24 * 3600_000).toLocaleDateString('ru-RU')})
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setExportOpen(false)} className="btn-ghost px-4 py-2 text-sm">
              Отмена
            </button>
            <button onClick={() => void handleExport()} disabled={exporting} className="btn-primary px-4 py-2 text-sm">
              {exporting ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-surface-950/30 border-t-surface-950" />
                  Формируем...
                </span>
              ) : (
                'Скачать отчёт'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
