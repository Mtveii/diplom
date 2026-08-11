import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Breadcrumbs from '@/components/Breadcrumbs'
import { EmptyState, PageSkeleton } from '@/components/PageState'
import AlertRulesPanel from '@/components/AlertRulesPanel'
import StatCard from '@/components/StatCard'
import { monitoringApi } from '@/services/api/monitoring.api'
import { steamApi } from '@/services/api/notifications.api'
import { useWatchlist } from '@/hooks/useWatchlist'
import { formatRelativeDate } from '@/utils/format'
import type { UnifiedGameDto } from '@/types/catalog'
import type { GameMonitorDto } from '@/types/monitoring'
import type { SteamNewsItemDto } from '@/types/steam'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Tab = 'overview' | 'price' | 'reviews' | 'news' | 'achievements' | 'alerts'

const PERIODS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: 0 },
]

export default function GameDetailPage() {
  const location = useLocation()
  const game = (location.state?.game as UnifiedGameDto | undefined) ?? null
  const { isMonitored, toggleMonitor } = useWatchlist()

  const [tab, setTab] = useState<Tab>('overview')
  const [monitor, setMonitor] = useState<GameMonitorDto | null>(null)
  const [news, setNews] = useState<SteamNewsItemDto[]>([])
  const [loading, setLoading] = useState(false)
  const [periodDays, setPeriodDays] = useState(90)

  const appId = game?.steamAppId ?? null
  const monitored = isMonitored(appId)

  const loadMonitor = useCallback(async (targetAppId: number) => {
    setLoading(true)
    try {
      const [gameData, newsData] = await Promise.all([monitoringApi.gameMonitor(targetAppId), steamApi.getNews(targetAppId)])
      setMonitor(gameData)
      setNews(newsData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (appId != null) {
      void loadMonitor(appId)
    }
  }, [appId, loadMonitor])

  const chartData = useMemo(() => {
    if (!monitor) {
      return []
    }
    const cutoff = periodDays > 0 ? Date.now() - periodDays * 24 * 3600_000 : 0
    return monitor.trend
      .filter((point) => cutoff === 0 || new Date(point.timestamp).getTime() >= cutoff)
      .map((point) => ({
        timestamp: new Date(point.timestamp).toLocaleDateString('ru-RU'),
        price: point.price != null ? point.price / 100 : null,
        discountPercent: point.discountPercent,
        positiveReviewPercent: point.positiveReviewPercent,
      }))
  }, [monitor, periodDays])

  const priceStats = useMemo(() => {
    const prices = monitor?.trend.map((p) => p.price).filter((p): p is number => p != null) ?? []
    if (prices.length === 0) {
      return { lowest: null, average: null }
    }
    return {
      lowest: Math.min(...prices) / 100,
      average: prices.reduce((sum, p) => sum + p, 0) / prices.length / 100,
    }
  }, [monitor])

  if (!game) {
    return <Navigate to="/games" replace />
  }

  const rating = game.rating != null ? game.rating / 20 : null

  const infoRows: Array<{ label: string; value: string }> = [
    { label: 'Developer', value: game.developer ?? '—' },
    { label: 'Publisher', value: game.publisher ?? '—' },
    { label: 'Release date', value: game.releaseDate ? new Date(game.releaseDate).toLocaleDateString('ru-RU') : '—' },
    { label: 'Platforms', value: game.platforms.join(' / ') || '—' },
    { label: 'Genres', value: game.genres.join(' / ') || '—' },
    { label: 'Steam AppID', value: game.steamAppId != null ? String(game.steamAppId) : '—' },
    { label: 'Owners', value: game.ownersEstimate ?? '—' },
    { label: 'Rating', value: rating != null ? `★ ${rating.toFixed(1)}` : '—' },
    { label: 'Price', value: game.isFree || game.price <= 0 ? 'Бесплатно' : `$${game.price.toFixed(2)}` },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Breadcrumbs>{game.name}</Breadcrumbs>
          <h1 className="mt-2 text-[26px] font-bold leading-tight text-white">{game.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {game.genres[0] ?? 'без жанра'} · {game.platforms.join(' / ') || 'платформа n/a'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/games" className="btn-ghost">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Назад в каталог
          </Link>
          {appId != null && (
            <button
              onClick={() => toggleMonitor(appId)}
              className={monitored ? 'btn-primary' : 'btn-ghost'}
              title={monitored ? 'Отключить мониторинг' : 'Включить мониторинг'}
            >
              <span className={`h-2 w-2 rounded-full ${monitored ? 'animate-pulse-dot bg-success-500' : 'bg-slate-500'}`} />
              {monitored ? 'Monitoring active' : 'Monitor'}
            </button>
          )}
          {appId != null && (
            <a
              href={`https://store.steampowered.com/app/${appId}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14L21 3" />
              </svg>
              Steam
            </a>
          )}
          {game.sourceUrls.gog && (
            <a href={game.sourceUrls.gog} target="_blank" rel="noreferrer" className="btn-ghost">
              GOG
            </a>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-surface-700">
        {(['overview', 'price', 'reviews', 'news', 'achievements', 'alerts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-primary-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {tab === 'overview' && (
          <div className="flex flex-col gap-5">
            {game.image && (
              <img
                src={game.image}
                alt={game.name}
                className="aspect-[16/9] w-full max-w-3xl rounded-2xl border border-surface-700/50 object-contain"
              />
            )}
            {game.description && (
              <div className="card p-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-200">Description</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{game.description}</p>
              </div>
            )}
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">Основные данные</h3>
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {infoRows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-3 border-b border-surface-800/60 pb-1.5 text-sm">
                    <dt className="shrink-0 text-slate-500">{row.label}</dt>
                    <dd className="text-right font-medium text-slate-200">{row.value}</dd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'price' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Current price"
                value={monitor?.currentPrice != null ? (monitor.currentPrice > 0 ? `$${(monitor.currentPrice / 100).toFixed(2)}` : 'Бесплатно') : '—'}
                accent="blue"
              />
              <StatCard
                label="Lowest price"
                value={priceStats.lowest != null ? `$${priceStats.lowest.toFixed(2)}` : '—'}
                accent="green"
              />
              <StatCard
                label="Average price"
                value={priceStats.average != null ? `$${priceStats.average.toFixed(2)}` : '—'}
                accent="amber"
              />
              <StatCard
                label="Discount, %"
                value={monitor?.currentDiscountPercent ?? '—'}
                accent="slate"
              />
            </div>

            <div className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-200">Price trend</h3>
                <div className="flex gap-1">
                  {PERIODS.map((period) => (
                    <button
                      key={period.label}
                      onClick={() => setPeriodDays(period.days)}
                      className={
                        periodDays === period.days
                          ? 'btn-primary px-3 py-1.5 text-xs'
                          : 'btn-ghost px-3 py-1.5 text-xs'
                      }
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <PageSkeleton variant="lines" count={3} />
              ) : chartData.length === 0 ? (
                <EmptyState title="Нет данных по цене" description="Тренд ещё не накоплен для этой игры" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#16404f" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="timestamp" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#16404f' }} tickLine={false} />
                    <YAxis yAxisId="percent" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="price"
                      orientation="right"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={46}
                      tickFormatter={(value: number) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0b2732',
                        border: '1px solid #16404f',
                        borderRadius: 12,
                        boxShadow: '0 12px 30px -10px rgba(4,20,26,0.9)',
                        fontSize: 12,
                      }}
                      formatter={(value, name) => (name === 'Цена, $' ? [`$${Number(value).toFixed(2)}`, name] : [value, name])}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="percent" dataKey="positiveReviewPercent" name="Положительных, %" stroke="#2dd4bf" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line yAxisId="percent" dataKey="discountPercent" name="Скидка, %" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line yAxisId="price" dataKey="price" name="Цена, $" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <StatCard
                label="Положительных, %"
                value={monitor?.positiveReviewPercent?.toFixed(1) ?? '—'}
                accent="blue"
              />
              <StatCard
                label="Всего ревью"
                value={monitor?.totalReviews ?? '—'}
                accent="slate"
              />
              <StatCard
                label="Рейтинг"
                value={monitor?.positiveReviewPercent != null ? `★ ${(monitor.positiveReviewPercent / 20).toFixed(1)}` : '—'}
                accent="amber"
              />
            </div>
            <div className="card p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Динамика отзывов</h3>
                <div className="flex gap-1">
                  {PERIODS.slice(0, 3).map((period) => (
                    <button
                      key={period.label}
                      onClick={() => setPeriodDays(period.days)}
                      className={periodDays === period.days ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-ghost px-3 py-1.5 text-xs'}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#16404f" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="timestamp" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#16404f' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0b2732', border: '1px solid #16404f', borderRadius: 12, fontSize: 12 }}
                  />
                  <Line dataKey="positiveReviewPercent" name="Положительных, %" stroke="#2dd4bf" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'news' && (
          <div className="card p-5">
            {news.length === 0 ? (
              <EmptyState title="Новостей нет" description="Steam не публиковал новостей для этой игры" />
            ) : (
              <div className="flex flex-col gap-2">
                {news.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-b border-surface-800 pb-2 text-sm last:border-0">
                    <a href={item.url ?? '#'} target="_blank" rel="noreferrer" className="truncate text-primary-400 hover:text-primary-300 hover:underline">
                      {item.title}
                    </a>
                    <span className="shrink-0 text-xs text-slate-500" title={item.date ? new Date(item.date).toLocaleString('ru-RU') : ''}>
                      {item.date ? formatRelativeDate(item.date) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="card p-5">
            {monitor && monitor.achievements.length > 0 ? (
              <>
                <h3 className="mb-3 text-sm font-semibold text-slate-200">
                  Ачивки: клан vs глобально
                  <span className="badge ml-2 border border-surface-700 bg-surface-800/60 text-slate-300">
                    владельцев в клане: {monitor.clanOwners}
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400">
                        <th className="pb-2">Ачивка</th>
                        <th className="pb-2">Клан, %</th>
                        <th className="pb-2">Глобально, %</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {monitor.achievements.slice(0, 50).map((achievement) => (
                        <tr key={achievement.achievementId} className="border-t border-surface-800/60 transition-colors hover:bg-surface-800/40">
                          <td className="py-2">{achievement.achievementId}</td>
                          <td className="py-2">{achievement.clanUnlockPercent.toFixed(1)}%</td>
                          <td className="py-2">
                            {achievement.globalUnlockPercent != null ? `${achievement.globalUnlockPercent.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState title="Ачивки недоступны" description="Сравнение с кланом требует подключённого Steam аккаунта" />
            )}
          </div>
        )}

        {tab === 'alerts' && (
          <AlertRulesPanel selectedAppId={appId ?? undefined} />
        )}
      </div>
    </div>
  )
}
