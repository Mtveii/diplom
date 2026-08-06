import { useCallback, useEffect, useState } from 'react'
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
import Spinner from '@/components/Spinner'
import { analyticsApi } from '@/services/api/analytics.api'
import type { ChurnRiskDto, CohortRowDto, PeriodComparisonDto, RetentionPointDto } from '@/types/analytics'

export default function AnalyticsPage() {
  const [retention, setRetention] = useState<RetentionPointDto[]>([])
  const [cohorts, setCohorts] = useState<CohortRowDto[]>([])
  const [churn, setChurn] = useState<ChurnRiskDto[]>([])
  const [comparison, setComparison] = useState<PeriodComparisonDto | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [ret, ch, cmp, cols] = await Promise.all([
        analyticsApi.retention(90),
        analyticsApi.churn(14),
        analyticsApi.compare(7),
        analyticsApi.cohorts(6),
      ])
      setRetention(ret)
      setChurn(ch)
      setComparison(cmp)
      setCohorts(cols)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const exportReport = async () => {
    const format = window.confirm('Excel (*.xlsx)? Нажмите ОК — Excel, Отмена — PDF.') ? 'Excel' : 'Pdf'
    await analyticsApi.export(format)
  }

  const changeBadge = (value: number) => {
    const color = value >= 0 ? 'text-emerald-400' : 'text-rose-400'
    return <span className={`font-semibold ${color}`}>{value >= 0 ? '+' : ''}{value.toFixed(1)}%</span>
  }

  if (loading) {
    return <Spinner />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Аналитика клана</h1>
          <p className="mt-0.5 text-sm text-slate-400">Retention, отток и когорты участников</p>
        </div>
        <button onClick={() => void exportReport()} className="btn-primary">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Экспорт отчёта
        </button>
      </div>

      {comparison && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card card-hover relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Активные игроки (неделя)</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-white">
              {comparison.currentActivePlayers}{' '}
              <span className="text-sm font-normal text-slate-500">vs {comparison.previousActivePlayers}</span>
            </div>
            <div className="mt-1 text-sm">{changeBadge(comparison.activePlayersChangePercent)}</div>
          </div>
          <div className="card card-hover relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-success-500 to-success-400" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Playtime за 2 недели</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-white">
              {(comparison.currentPlaytimeMinutes / 60).toFixed(0)} ч
            </div>
            <div className="mt-1 text-sm">{changeBadge(comparison.playtimeChangePercent)}</div>
          </div>
          <div className="card card-hover relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent-500 to-accent-400" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Средний онлайн</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-white">
              {comparison.currentAverageDailyOnline.toFixed(1)}
            </div>
            <div className="mt-1 text-sm">{changeBadge(comparison.averageOnlineChangePercent)}</div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Retention (7/30/90 дней)</h3>
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
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Риск оттока (churn)</h3>
          <div className="flex flex-col gap-3">
            {churn.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
                Риск оттока не обнаружен — участники активны
              </div>
            ) : (
              churn.map((member) => (
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
        <h3 className="mb-4 text-sm font-semibold text-slate-200">Когортный анализ (по месяцу вступления)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-2">Когорта</th>
                <th className="pb-2">Размер</th>
                {[7, 30, 90].map((day) => (
                  <th key={day} className="pb-2">Retention {day}d, %</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {cohorts.map((cohort) => (
                <tr key={cohort.cohortMonth} className="border-t border-surface-700/60 transition-colors hover:bg-surface-800/40">
                  <td className="py-2 font-medium text-slate-100">{cohort.cohortMonth}</td>
                  <td className="py-2">{cohort.cohortSize}</td>
                  {[7, 30, 90].map((day) => (
                    <td key={day} className="py-2">
                      {cohort.points.find((p) => p.day === day)?.retainedPercent.toFixed(1) ?? '—'}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}