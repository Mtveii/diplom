import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
import AlertRulesPanel from '@/components/AlertRulesPanel'
import CatalogDetailModal from '@/components/CatalogDetailModal'
import ErrorState from '@/components/ErrorState'
import GameCatalogCard from '@/components/GameCatalogCard'
import Spinner from '@/components/Spinner'
import StatCard from '@/components/StatCard'
import { catalogApi } from '@/services/api/catalog.api'
import { monitoringApi } from '@/services/api/monitoring.api'
import { steamApi } from '@/services/api/notifications.api'
import { useCatalog } from '@/hooks/useCatalog'
import { CatalogMatchKind } from '@/types/catalog'
import type { CatalogGameDetailDto, CatalogListItemDto } from '@/types/catalog'
import type { GameMonitorDto, GameTrendPointDto } from '@/types/monitoring'
import type { SteamNewsItemDto } from '@/types/steam'

const GRID_ROW_HEIGHT = 204
const LIST_ROW_HEIGHT = 64
const CARD_MIN_WIDTH = 260
const GRID_GAP = 16

type ViewMode = 'grid' | 'list'

interface FilterState {
  genres: string[]
  minPrice: number
  onlyDiscounted: boolean
  onlyMatched: boolean
}

export default function GameMonitorPage() {
  const { games, loading, error, reload } = useCatalog()

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({ genres: [], minPrice: 0, onlyDiscounted: false, onlyMatched: false })
  const [view, setView] = useState<ViewMode>('grid')

  const [selectedGame, setSelectedGame] = useState<CatalogListItemDto | null>(null)
  const [detail, setDetail] = useState<CatalogGameDetailDto | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [monitorAppId, setMonitorAppId] = useState<number | null>(null)
  const [game, setGame] = useState<GameMonitorDto | null>(null)
  const [news, setNews] = useState<SteamNewsItemDto[]>([])
  const [monitorLoading, setMonitorLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(3)

  const genres = useMemo(
    () =>
      Array.from(
        new Set(
          games
            .map((g) => g.genre)
            .filter((g): g is string => Boolean(g)),
        ),
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [games],
  )

  const maxPrice = useMemo(
    () => Math.max(0, ...games.map((g) => (g.priceCents ?? 0) / 100)),
    [games],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return games.filter((g) => {
      if (q && !g.title.toLowerCase().includes(q) && !(g.shortDescription ?? '').toLowerCase().includes(q)) {
        return false
      }
      if (filters.genres.length > 0 && !filters.genres.includes(g.genre ?? '')) {
        return false
      }
      if (filters.onlyDiscounted && (g.discountPercent == null || g.discountPercent <= 0)) {
        return false
      }
      if (filters.onlyMatched && g.matchKind !== CatalogMatchKind.MatchedWithSteamSpy) {
        return false
      }
      if (filters.minPrice > 0 && (g.priceCents ?? 0) / 100 < filters.minPrice) {
        return false
      }
      return true
    })
  }, [games, query, filters])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const update = () => {
      const width = el.clientWidth
      const next = Math.max(1, Math.floor((width + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)))
      setColumns(next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const rowCount = view === 'grid' ? Math.ceil(filtered.length / columns) : filtered.length
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (view === 'grid' ? GRID_ROW_HEIGHT : LIST_ROW_HEIGHT),
    overscan: 4,
  })

  const toggleGenre = useCallback((genre: string) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }))
  }, [])

  const openGame = useCallback(async (item: CatalogListItemDto) => {
    setSelectedGame(item)
    setDetail(null)
    setDetailLoading(true)
    try {
      const data = await catalogApi.game(item.freeToGameId)
      setDetail(data)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const loadMonitor = useCallback(async (appId: number) => {
    setMonitorAppId(appId)
    setMonitorLoading(true)
    try {
      const [gameData, newsData] = await Promise.all([monitoringApi.gameMonitor(appId), steamApi.getNews(appId)])
      setGame(gameData)
      setNews(newsData)
    } finally {
      setMonitorLoading(false)
    }
  }, [])

  const handleOpen = useCallback(
    (item: CatalogListItemDto) => {
      void openGame(item)
      if (item.steamAppId != null) {
        void loadMonitor(item.steamAppId)
      } else {
        setMonitorAppId(null)
        setGame(null)
        setNews([])
      }
    },
    [openGame, loadMonitor],
  )

  const formatTrend = (trend: GameTrendPointDto[]) =>
    trend.map((point) => ({
      ...point,
      timestamp: new Date(point.timestamp).toLocaleDateString('ru-RU'),
      price: point.price != null ? point.price / 100 : null,
    }))

  if (loading) {
    return <Spinner />
  }

  if (error) {
    return <ErrorState message="Не удалось загрузить каталог игр" onRetry={() => void reload()} />
  }

  const matchedCount = games.filter((g) => g.steamAppId != null).length

  const renderGridRow = (start: number, count: number) => {
    const rowItems = filtered.slice(start, start + count)
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {rowItems.map((item) => (
          <GameCatalogCard key={item.freeToGameId} game={item} onOpen={handleOpen} />
        ))}
      </div>
    )
  }

  const renderListRow = (item: CatalogListItemDto) => (
    <button
      key={item.freeToGameId}
      onClick={() => handleOpen(item)}
      className="card card-hover flex h-[52px] items-center gap-3 overflow-hidden p-0 pr-3 text-left"
    >
      {item.thumbnail ? (
        <img src={item.thumbnail} alt={item.title} loading="lazy" className="h-full w-20 shrink-0 object-cover" />
      ) : (
        <div className="flex h-full w-20 shrink-0 items-center justify-center bg-surface-800 text-sm font-bold text-surface-700">
          {item.title.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-slate-100 group-hover:text-white">{item.title}</h3>
        <p className="truncate text-[11px] text-slate-500">
          {item.genre ?? 'без жанра'}
          {item.matchKind === CatalogMatchKind.MatchedWithSteamSpy
            ? ` · онлайн: ${item.ccu?.toLocaleString('ru-RU') ?? '—'}`
            : ' · метрики: нет данных'}
        </p>
      </div>
      <span
        className="shrink-0 text-sm font-semibold text-white"
        title={item.matchKind === CatalogMatchKind.MatchedWithSteamSpy ? 'Цена. По данным SteamSpy, оценка, погрешность ±10%' : 'Метрика по SteamSpy отсутствует'}
      >
        {item.priceCents == null ? 'нет данных' : item.priceCents > 0 ? `$${(item.priceCents / 100).toFixed(2)}` : 'Бесплатно'}
      </span>
    </button>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Мониторинг игр и алерты</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Каталог FreeToGame ({games.length} игр), обогащённый статистикой SteamSpy ({matchedCount})
          </p>
        </div>
        <button onClick={() => void reload()} className="btn-ghost">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
          Обновить
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="card flex h-fit flex-col gap-5 p-4 lg:w-60 lg:shrink-0">
          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Поиск</h2>
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Название игры..."
                className="input w-full pl-9"
              />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Жанры</h2>
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
              {genres.map((g) => (
                <label key={g} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-300 transition-colors hover:bg-surface-800">
                  <input
                    type="checkbox"
                    checked={filters.genres.includes(g)}
                    onChange={() => toggleGenre(g)}
                    className="h-3.5 w-3.5 rounded border-surface-700 bg-surface-950 accent-primary-500"
                  />
                  <span className="truncate">{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Минимальная цена: ${filters.minPrice.toFixed(0)}
            </h2>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.round(maxPrice))}
              step={1}
              value={filters.minPrice}
              onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: Number(event.target.value) }))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>$0</span>
              <span>${Math.max(1, Math.round(maxPrice))}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={filters.onlyDiscounted}
                onChange={(event) => setFilters((prev) => ({ ...prev, onlyDiscounted: event.target.checked }))}
                className="h-3.5 w-3.5 rounded border-surface-700 bg-surface-950 accent-primary-500"
              />
              Только со скидкой
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={filters.onlyMatched}
                onChange={(event) => setFilters((prev) => ({ ...prev, onlyMatched: event.target.checked }))}
                className="h-3.5 w-3.5 rounded border-surface-700 bg-surface-950 accent-primary-500"
              />
              Только с SteamSpy-данными
            </label>
          </div>

          <div className="text-xs text-slate-500">
            Показано: {filtered.length} из {games.length}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-end gap-2">
            <div className="flex rounded-xl border border-surface-700 bg-surface-900 p-0.5">
              <button
                onClick={() => setView('grid')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === 'grid' ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Сетка"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === 'list' ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Список"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <rect x="3" y="10" width="18" height="4" rx="1" />
                  <rect x="3" y="16" width="18" height="4" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="h-[calc(100vh-280px)] overflow-y-auto pr-1">
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualRow) => (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingRight: view === 'grid' ? 0 : 12,
                  }}
                >
                  {view === 'grid'
                    ? renderGridRow(virtualRow.index * columns, columns)
                    : (
                        <div className="flex flex-col gap-3 pr-1">
                          {filtered.slice(virtualRow.index, virtualRow.index + 1).map(renderListRow)}
                        </div>
                      )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {monitorAppId != null && game && (
        <div className="flex flex-col gap-6">
          {monitorLoading && <Spinner />}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Текущая цена, $" value={game.currentPrice != null ? (game.currentPrice > 0 ? `$${(game.currentPrice / 100).toFixed(2)}` : 'Бесплатно') : '—'} />
            <StatCard label="Скидка, %" value={game.currentDiscountPercent ?? '—'} accent="green" />
            <StatCard label="Положительные ревью, %" value={game.positiveReviewPercent?.toFixed(1) ?? '—'} accent="blue" />
            <StatCard label="Всего ревью" value={game.totalReviews ?? '—'} accent="slate" />
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">
              Тренд {game.name}: ревью и цена
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={formatTrend(game.trend)} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
          </div>

          {news.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">Новости по игре</h3>
              <div className="flex flex-col gap-2">
                {news.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-b border-surface-800 pb-2 text-sm last:border-0">
                    <a href={item.url ?? '#'} target="_blank" rel="noreferrer" className="truncate text-primary-400 hover:text-primary-300 hover:underline">
                      {item.title}
                    </a>
                    <span className="shrink-0 text-xs text-slate-500">
                      {item.date ? new Date(item.date).toLocaleDateString('ru-RU') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {game.achievements.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">
                Ачивки: клан vs глобально
                <span className="badge ml-2 border border-surface-700 bg-surface-800/60 text-slate-300">
                  владельцев в клане: {game.clanOwners}
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
                    {game.achievements.slice(0, 20).map((achievement) => (
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
            </div>
          )}
        </div>
      )}

      <AlertRulesPanel selectedAppId={monitorAppId ?? undefined} />

      {selectedGame && (
        <CatalogDetailModal
          game={selectedGame}
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelectedGame(null)}
          onShowMonitor={() => {
            if (selectedGame.steamAppId != null) {
              void loadMonitor(selectedGame.steamAppId)
              setSelectedGame(null)
            }
          }}
        />
      )}
    </div>
  )
}