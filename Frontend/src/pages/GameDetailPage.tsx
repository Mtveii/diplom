import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Breadcrumbs from '@/components/Breadcrumbs'
import { EmptyState, PageSkeleton } from '@/components/PageState'
import AchievementBars from '@/components/AchievementBars'
import AlertRulesPanel from '@/components/AlertRulesPanel'
import ForecastOverlay from '@/components/ForecastOverlay'
import ForecastToggle from '@/components/ForecastToggle'
import GameDetailsExtra from '@/components/GameDetailsExtra'
import { chartTheme } from '@/styles/chartTheme'
import StatCard from '@/components/StatCard'
import { monitoringApi } from '@/services/api/monitoring.api'
import { catalogApi } from '@/services/api/catalog.api'
import { steamApi } from '@/services/api/notifications.api'
import { useLocale } from '@/hooks/useLocale'
import { useAuthStore } from '@/store/authStore'
import { canManageAlerts } from '@/utils/role'
import { useWatchlist } from '@/hooks/useWatchlist'
import { buildSeriesForecast, forecastHorizon, inferStepMs, type AppliedForecast } from '@/utils/forecast'
import { formatDay, formatFullDateTime, formatRelativeDate } from '@/utils/format'
import type { GameDetailsDto, UnifiedGameDto } from '@/types/catalog'
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

function formatMoney(value: number | null | undefined, freeLabel: string): string {
  if (value == null) {
    return '—'
  }
  return value > 0 ? `$${value.toFixed(2)}` : freeLabel
}

export default function GameDetailPage() {
  const location = useLocation()
  const { t, locale } = useLocale()
  const game = (location.state?.game as UnifiedGameDto | undefined) ?? null
  const { isMonitored, toggleMonitor } = useWatchlist()
  const tabLabels: Record<Tab, string> = {
    overview: t.gameDetail.tabOverview,
    price: t.gameDetail.tabPrice,
    reviews: t.gameDetail.tabReviews,
    news: t.gameDetail.tabNews,
    achievements: t.gameDetail.tabAchievements,
    alerts: t.gameDetail.tabAlerts,
  }

  const [tab, setTab] = useState<Tab>('overview')
  const role = useAuthStore((state) => state.role)
  /** Правила алертов — только SuperAdmin и Admin (см. ROUTES_ACCESS). */
  const canShowAlerts = canManageAlerts(role)
  const visibleTabs = useMemo(
    () =>
      (['overview', 'price', 'reviews', 'news', 'achievements', 'alerts'] as Tab[]).filter(
        (tabKey) => tabKey !== 'alerts' || canShowAlerts,
      ),
    [canShowAlerts],
  )
  const [monitor, setMonitor] = useState<GameMonitorDto | null>(null)
  const [details, setDetails] = useState<GameDetailsDto | null>(null)
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
    } catch (err) {
      console.warn('[GameDetailPage] Не удалось загрузить данные игры — показываю пустые данные', err)
      setMonitor(null)
      setNews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (appId != null) {
      void loadMonitor(appId)
    }
  }, [appId, loadMonitor])

  useEffect(() => {
    let cancelled = false
    if (game == null) {
      return undefined
    }
    void catalogApi.gameDetails(game.id).then((result) => {
      if (!cancelled) {
        setDetails(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [game])

  const [forecastOn, setForecastOn] = useState(false)

  const trendView = useMemo(() => {
    const empty = { rows: [] as object[], from: null as string | null, applied: [] as AppliedForecast[], count: 0 }
    if (!monitor) {
      return empty
    }
    const cutoff = periodDays > 0 ? Date.now() - periodDays * 24 * 3600_000 : 0
    const raw = monitor.trend.filter((point) => cutoff === 0 || new Date(point.timestamp).getTime() >= cutoff)
    const base: object[] = raw.map((point) => ({
      timestamp: formatDay(point.timestamp, locale),
      price: point.price != null ? point.price / 100 : null,
      discountPercent: point.discountPercent,
      positiveReviewPercent: point.positiveReviewPercent,
    }))
    if (!forecastOn || raw.length < 2) {
      return { rows: base, from: null as string | null, applied: [] as AppliedForecast[], count: raw.length }
    }
    const specs: Array<{
      key: string
      label: string
      color: string
      axis: 'percent' | 'price'
      min?: number
      max?: number
      extract: (point: (typeof raw)[number]) => number | null
    }> = [
      { key: 'positiveReviewPercent', label: t.catalog.seriesPositive, color: '#2dd4bf', axis: 'percent', min: 0, max: 100, extract: (point) => point.positiveReviewPercent },
      { key: 'discountPercent', label: t.catalog.seriesDiscount, color: '#f59e0b', axis: 'percent', min: 0, max: 100, extract: (point) => point.discountPercent },
      { key: 'price', label: t.catalog.seriesPrice, color: '#a78bfa', axis: 'price', min: 0, extract: (point) => (point.price != null ? point.price / 100 : null) },
    ]
    const rawTimes = raw.map((point) => new Date(point.timestamp).getTime())
    const step = inferStepMs(rawTimes.filter(Number.isFinite))
    const horizon = forecastHorizon(raw.length)
    const lastRawTime = rawTimes[rawTimes.length - 1]
    const futureRows: Array<Record<string, string | number | [number, number] | null>> = Array.from(
      { length: horizon },
      (_, h) => ({ timestamp: formatDay(new Date(lastRawTime + step * (h + 1)).toISOString(), locale) }),
    )
    const applied: AppliedForecast[] = []
    for (const spec of specs) {
      const values: number[] = []
      const times: number[] = []
      for (const point of raw) {
        const value = spec.extract(point)
        const time = new Date(point.timestamp).getTime()
        if (value !== null && Number.isFinite(value) && Number.isFinite(time)) {
          values.push(value)
          times.push(time)
        }
      }
      const result = buildSeriesForecast({
        values,
        times,
        label: spec.label,
        color: spec.color,
        min: spec.min,
        max: spec.max,
        horizon,
        stepMs: step,
      })
      if (!result || result.points.length === 0) {
        continue
      }
      applied.push({ key: spec.key, label: spec.label, color: spec.color, axis: spec.axis })
      result.points.forEach((forecastPoint, index) => {
        futureRows[index][spec.key] = forecastPoint.value
        futureRows[index][`${spec.key}Range`] = [forecastPoint.lower, forecastPoint.upper]
      })
    }
    return { rows: [...base, ...futureRows], from: formatDay(new Date(lastRawTime).toISOString(), locale), applied, count: raw.length }
  }, [monitor, periodDays, forecastOn, locale, t])

  if (!game) {
    return <Navigate to="/games" replace />
  }

  const rating = game.rating != null ? game.rating / 20 : null

  const detailDeveloper = details?.developer ?? game.developer
  const detailPublisher = details?.publisher ?? game.publisher
  const detailReleaseDate = details?.releaseDate ?? game.releaseDate
  const detailDescription = details?.description ?? game.description
  const detailImage = details?.thumbnail ?? game.image

  const infoRows: Array<{ label: string; value: string }> = [
    { label: t.gameDetail.infoDeveloper, value: detailDeveloper ?? '—' },
    { label: t.gameDetail.infoPublisher, value: detailPublisher ?? '—' },
    { label: t.gameDetail.infoRelease, value: detailReleaseDate ? formatDay(detailReleaseDate, locale) : '—' },
    { label: t.gameDetail.infoPlatforms, value: game.platforms.join(' / ') || '—' },
    { label: t.gameDetail.infoGenres, value: game.genres.join(' / ') || '—' },
    { label: 'Steam AppID', value: game.steamAppId != null ? String(game.steamAppId) : '—' },
    { label: t.catalog.owners, value: game.ownersEstimate ?? '—' },
    { label: t.gameDetail.ratingLabel, value: rating != null ? `★ ${rating.toFixed(1)}` : '—' },
    { label: t.gameDetail.tabPrice, value: game.isFree || game.price <= 0 ? t.common.free : `$${game.price.toFixed(2)}` },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Breadcrumbs>{game.name}</Breadcrumbs>
          <h1 className="mt-2 text-[26px] font-bold leading-tight text-white">{game.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {game.genres[0] ?? t.catalog.noGenre} · {game.platforms.join(' / ') || t.catalog.platformNa}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/games" className="btn-ghost">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            {t.gameDetail.back}
          </Link>
          {appId != null && (
            <button
              onClick={() => toggleMonitor(appId)}
              className={monitored ? 'btn-primary' : 'btn-ghost'}
              title={monitored ? t.catalog.monitorOff : t.catalog.monitorOn}
            >
              <span className={`h-2 w-2 rounded-full ${monitored ? 'animate-pulse-dot bg-success-500' : 'bg-slate-500'}`} />
              {monitored ? t.gameDetail.monitoringActive : t.gameDetail.monitor}
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
        {visibleTabs.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-medium capitalize transition-colors ${
              tab === tabKey ? 'hud-tab-active border-primary-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tabLabels[tabKey]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {tab === 'overview' && (
          <div className="flex flex-col gap-5">
            {detailImage && (
              <img
                src={detailImage}
                alt={game.name}
                className="aspect-[16/9] w-full max-w-3xl rounded-2xl border border-surface-700/50 object-contain"
              />
            )}
            {detailDescription && (
              <div className="card card-hud p-5">
                <div className="card-header-hud mb-2">
                  <h3 className="card-header-hud__title">{t.gameDetail.description}</h3>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{detailDescription}</p>
              </div>
            )}
            {details && (
              <GameDetailsExtra gameName={game.name} tags={details.tags} screenshots={details.screenshots} dlcs={details.dlcs} />
            )}
            <div className="card card-hud p-5">
              <div className="card-header-hud mb-3">
                  <h3 className="card-header-hud__title">{t.gameDetail.mainData}</h3>
              </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t.gameDetail.currentPrice}
                value={formatMoney(details?.price ?? game.price, t.common.free)}
                accent="blue"
              />
              <StatCard
                label={t.gameDetail.oldPrice}
                value={details?.oldPrice != null ? `$${details.oldPrice.toFixed(2)}` : '—'}
                accent="green"
              />
              <StatCard
                label={t.gameDetail.ratingLabel}
                value={details?.averageRating != null ? details.averageRating.toFixed(1) : '—'}
                accent="amber"
              />
              <StatCard
                label={t.gameDetail.discountPct}
                value={details?.discountPercent ?? '—'}
                accent="slate"
              />
            </div>

            <div className="card card-hud p-5">
              <div className="card-header-hud mb-4">
                <h3 className="card-header-hud__title">{t.gameDetail.priceTrend}</h3>
                <div className="card-header-hud__subtitle flex gap-1">
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
                  {trendView.count >= 2 && (
                    <ForecastToggle enabled={forecastOn} onToggle={() => setForecastOn((prev) => !prev)} />
                  )}
                </div>
              </div>
              {loading ? (
                <PageSkeleton variant="lines" count={3} />
              ) : trendView.rows.length === 0 ? (
                <EmptyState title={t.gameDetail.noPriceData} description={t.gameDetail.noTrendYet} />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendView.rows} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="timestamp" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={{ stroke: chartTheme.axisLine }} tickLine={false} />
                    <YAxis yAxisId="percent" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="price"
                      orientation="right"
                      tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={46}
                      tickFormatter={(value: number) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: chartTheme.tooltip.background,
                        border: chartTheme.tooltip.border,
                        borderRadius: chartTheme.tooltip.borderRadius,
                        boxShadow: chartTheme.tooltip.boxShadow,
                        fontSize: chartTheme.tooltip.fontSize,
                      }}
                      formatter={(value, name) => {
                        if (Array.isArray(value)) {
                          const [lo, hi] = value as [number, number]
                          return [`${lo.toFixed(1)}–${hi.toFixed(1)}`, name]
                        }
                        return name === t.catalog.seriesPrice ? [`$${Number(value).toFixed(2)}`, name] : [value, name]
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="percent" dataKey="positiveReviewPercent" name={t.catalog.seriesPositive} stroke="#2dd4bf" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line yAxisId="percent" dataKey="discountPercent" name={t.catalog.seriesDiscount} stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line yAxisId="price" dataKey="price" name={t.catalog.seriesPrice} stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <ForecastOverlay applied={trendView.applied} from={trendView.from} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label={t.gameDetail.positivePct}
                value={monitor?.positiveReviewPercent?.toFixed(1) ?? '—'}
                accent="blue"
              />
              <StatCard
                label={t.gameDetail.totalReviews}
                value={details?.reviews.length ?? '—'}
                accent="slate"
              />
              <StatCard
                label={t.gameDetail.ratingLabel}
                value={details?.averageRating != null ? details.averageRating.toFixed(1) : '—'}
                accent="amber"
              />
            </div>
            <div className="card card-hud p-5">
              <div className="card-header-hud mb-2">
                  <h3 className="card-header-hud__title">{t.gameDetail.reviewsDynamics}</h3>
                <div className="card-header-hud__subtitle flex gap-1">
                  {PERIODS.slice(0, 3).map((period) => (
                    <button
                      key={period.label}
                      onClick={() => setPeriodDays(period.days)}
                      className={periodDays === period.days ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-ghost px-3 py-1.5 text-xs'}
                    >
                      {period.label}
                    </button>
                  ))}
                  {trendView.count >= 2 && (
                    <ForecastToggle enabled={forecastOn} onToggle={() => setForecastOn((prev) => !prev)} />
                  )}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendView.rows} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="timestamp" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={{ stroke: chartTheme.axisLine }} tickLine={false} />
                  <YAxis tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: chartTheme.tooltip.background,
                      border: chartTheme.tooltip.border,
                      borderRadius: chartTheme.tooltip.borderRadius,
                      boxShadow: chartTheme.tooltip.boxShadow,
                      fontSize: chartTheme.tooltip.fontSize,
                    }}
                    formatter={(value, name) => {
                      if (Array.isArray(value)) {
                        const [lo, hi] = value as [number, number]
                        return [`${lo.toFixed(1)}–${hi.toFixed(1)}`, name]
                      }
                      return [value, name]
                    }}
                  />
                  <Line dataKey="positiveReviewPercent" name={t.catalog.seriesPositive} stroke="#2dd4bf" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <ForecastOverlay
                    applied={trendView.applied
                      .filter((spec) => spec.key === 'positiveReviewPercent')
                      .map((spec) => ({ key: spec.key, label: spec.label, color: spec.color }))}
                    from={trendView.from}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {details && details.reviews.length > 0 && (
              <div className="card card-hud p-5">
                <div className="card-header-hud mb-3">
                  <h3 className="card-header-hud__title">{t.gameDetail.reviewsList}</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {details.reviews.map((review, index) => (
                    <div
                      key={`${review.username ?? 'anonymous'}-${review.date ?? index}`}
                      className="border-b border-surface-800/60 pb-3 text-sm last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-slate-100">{review.username ?? t.common.untitled}</span>
                        {review.score != null && (
                          <span className="shrink-0 rounded-md border border-surface-700 bg-surface-800 px-1.5 py-0.5 text-xs font-semibold text-warning-400">
                            ★ {review.score}
                          </span>
                        )}
                      </div>
                      {review.text && <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-400">{review.text}</p>}
                      {review.date && (
                        <div className="mt-1 text-[11px] text-slate-500" title={formatFullDateTime(review.date, locale)}>
                          {formatRelativeDate(review.date, Date.now(), locale)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'news' && (
          <div className="card card-hud p-5">
            {news.length === 0 ? (
              <EmptyState title={t.gameDetail.noNews} description={t.gameDetail.noNewsDesc} />
            ) : (
              <div className="flex flex-col gap-2">
                {news.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-b border-surface-800 pb-2 text-sm last:border-0">
                    <a href={item.url ?? '#'} target="_blank" rel="noreferrer" className="truncate text-primary-400 hover:text-primary-300 hover:underline">
                      {item.title}
                    </a>
                    <span className="shrink-0 text-xs text-slate-500" title={item.date ? formatFullDateTime(item.date, locale) : ''}>
                      {item.date ? formatRelativeDate(item.date, Date.now(), locale) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="card card-hud p-5">
            {monitor && monitor.achievements.length > 0 ? (
              <>
                <div className="card-header-hud mb-3">
                  <h3 className="card-header-hud__title">
                    {t.achievements.title}
                  </h3>
                  <span className="card-header-hud__subtitle badge border border-surface-700 bg-surface-800/60 text-slate-300">
                    {t.achievements.ownersAmong(monitor.clanOwners)}
                  </span>
                </div>
                <AchievementBars achievements={monitor.achievements} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400">
                        <th className="pb-2">{t.achievements.colName}</th>
                        <th className="pb-2">{t.achievements.colOurs}</th>
                        <th className="pb-2">{t.achievements.colGlobal}</th>
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
              <EmptyState title={t.gameDetail.noAchievements} description={t.gameDetail.noAchievementsDesc} />
            )}
          </div>
        )}

        {tab === 'alerts' && canShowAlerts && (
          <AlertRulesPanel selectedAppId={appId ?? undefined} />
        )}
      </div>
    </div>
  )
}
