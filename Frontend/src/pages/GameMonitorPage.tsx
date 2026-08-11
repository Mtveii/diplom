import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { monitoringApi } from '@/services/api/monitoring.api'
import { steamApi } from '@/services/api/notifications.api'
import { useCatalog } from '@/hooks/useCatalog'
import { formatRelativeDate } from '@/utils/format'
import type { UnifiedGameDto } from '@/types/catalog'
import type { GameMonitorDto, GameTrendPointDto } from '@/types/monitoring'
import type { SteamNewsItemDto } from '@/types/steam'

const LIST_ROW_HEIGHT = 64
const CARD_MIN_WIDTH = 252
const CARD_BODY_HEIGHT = 134
const COMPACT_BODY_HEIGHT = 72
const CARD_ASPECT = 9 / 16
const GRID_GAP = 16
const LOAD_MORE_THRESHOLD = 600

type ViewMode = 'grid' | 'compact' | 'list'
type SortKey = 'relevance' | 'name' | 'rating' | 'price' | 'owners' | 'release'
type PageTab = 'catalog' | 'monitoring' | 'alerts'

interface FilterState {
  genres: string[]
  minPrice: number
  onlyMatched: boolean
  platform: string
  source: string
}

function CatalogGridSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-72 animate-pulse rounded-lg bg-surface-800/70" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-800/50" />
        </div>
        <div className="h-[44px] w-32 animate-pulse rounded-xl bg-surface-800/70" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
        <div className="hidden w-[280px] shrink-0 animate-pulse rounded-2xl bg-surface-800/50 lg:block" />
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-surface-700/40">
              <div className="aspect-[16/9] animate-pulse bg-surface-800/70" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-800/60" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-800/40" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-800/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GameMonitorPage() {
  const { games, totalResults, loading, loadingMore, error, reload, loadMore, hasMore } = useCatalog()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({ genres: [], minPrice: 0, onlyMatched: false, platform: '', source: '' })
  const [view, setView] = useState<ViewMode>('grid')
  const [sort, setSort] = useState<SortKey>('relevance')
  const [tab, setTab] = useState<PageTab>('catalog')

  const [selectedGame, setSelectedGame] = useState<UnifiedGameDto | null>(null)

  const [monitorAppId, setMonitorAppId] = useState<number | null>(null)
  const [game, setGame] = useState<GameMonitorDto | null>(null)
  const [news, setNews] = useState<SteamNewsItemDto[]>([])
  const [monitorLoading, setMonitorLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(2)
  const [rowHeight, setRowHeight] = useState(300)

  const genres = useMemo(
    () =>
      Array.from(
        new Set(games.flatMap((g) => g.genres).filter((g): g is string => Boolean(g))),
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [games],
  )

  const maxPrice = useMemo(
    () => Math.max(0, ...games.map((g) => g.price)),
    [games],
  )

  const platforms = useMemo(() => Array.from(new Set(games.flatMap((g) => g.platforms))).sort(), [games])

  const sources = useMemo(() => Array.from(new Set(games.flatMap((g) => g.sources))).sort(), [games])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return games.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q) && !(g.description ?? '').toLowerCase().includes(q)) {
        return false
      }
      if (filters.genres.length > 0 && !filters.genres.some((genre) => g.genres.includes(genre))) {
        return false
      }
      if (filters.onlyMatched && g.steamAppId == null) {
        return false
      }
      if (filters.minPrice > 0 && (g.isFree || g.price < filters.minPrice)) {
        return false
      }
      if (filters.platform && !g.platforms.includes(filters.platform)) {
        return false
      }
      if (filters.source && !g.sources.includes(filters.source)) {
        return false
      }
      return true
    })
  }, [games, query, filters])

  const parseOwnersMin = (owners: string | null): number => {
    const match = owners?.match(/\d[\d\s,]*/)
    return match ? parseInt(match[0].replace(/[\s,]/g, ''), 10) : 0
  }

  const sorted = useMemo(() => {
    const list = [...filtered]
    switch (sort) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      case 'rating':
        return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      case 'price':
        return list.sort((a, b) => a.price - b.price)
      case 'owners':
        return list.sort((a, b) => parseOwnersMin(b.ownersEstimate) - parseOwnersMin(a.ownersEstimate))
      case 'release':
        return list.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
      default:
        return list
    }
  }, [filtered, sort])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const update = () => {
      const width = el.clientWidth
      const next = Math.max(1, Math.floor((width + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)))
      const colWidth = (width - (next - 1) * GRID_GAP) / next
      const body = view === 'compact' ? COMPACT_BODY_HEIGHT : CARD_BODY_HEIGHT
      setColumns(next)
      setRowHeight(Math.round(colWidth * CARD_ASPECT) + body)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [view])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD) {
      void loadMore()
    }
  }, [loadMore])

  const filtersActive =
    query.trim() !== '' || filters.genres.length > 0 || filters.minPrice > 0 || filters.onlyMatched || filters.platform !== '' || filters.source !== ''

  useEffect(() => {
    if (loading || loadingMore || filtersActive) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    if (el.scrollHeight - el.clientHeight < 200 && hasMore) {
      void loadMore()
    }
  }, [loading, loadingMore, filtersActive, hasMore, loadMore, sorted.length, view, columns, rowHeight])

  const colCount = view === 'list' ? Math.min(3, columns) : columns
  const rowCount = Math.ceil(sorted.length / colCount)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (view === 'grid' ? rowHeight : LIST_ROW_HEIGHT),
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
    (item: UnifiedGameDto) => {
      setSelectedGame(item)
      if (item.steamAppId != null) {
        void loadMonitor(item.steamAppId)
      } else {
        setMonitorAppId(null)
        setGame(null)
        setNews([])
      }
    },
    [loadMonitor],
  )

  const [trendDays, setTrendDays] = useState(30)

  const formatTrend = (trend: GameTrendPointDto[]) =>
    trend.map((point) => ({
      ...point,
      timestamp: new Date(point.timestamp).toLocaleDateString('ru-RU'),
      price: point.price != null ? point.price / 100 : null,
    }))

  const cutTrend = (trend: GameTrendPointDto[]) => {
    const cutoff = Date.now() - trendDays * 24 * 60 * 60 * 1000
    return trend.filter((point) => new Date(point.timestamp).getTime() >= cutoff)
  }

  if (loading) {
    return <CatalogGridSkeleton />
  }

  if (error) {
    return <ErrorState message="Не удалось загрузить каталог игр" onRetry={() => void reload()} />
  }

  const matchedCount = games.filter((g) => g.steamAppId != null).length

  const renderGridRow = (start: number, count: number) => {
    const rowItems = sorted.slice(start, start + count)
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {rowItems.map((item) => (
          <GameCatalogCard key={item.id} game={item} onOpen={handleOpen} compact={view === 'compact'} />
        ))}
      </div>
    )
  }

  const renderListRow = (start: number, count: number) => {
    const rowItems = sorted.slice(start, start + count)
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {rowItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleOpen(item)}
            className="group card card-hover flex h-[52px] items-center gap-3 overflow-hidden p-0 pr-3 text-left"
          >
            {item.image ? (
              <img src={item.image} alt={item.name} loading="lazy" className="h-full w-20 shrink-0 object-cover" />
            ) : (
              <div className="flex h-full w-20 shrink-0 items-center justify-center bg-surface-800/70 text-sm font-bold text-surface-700">
                {item.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-slate-100 group-hover:text-white">{item.name}</h3>
              <p className="truncate text-[11px] text-slate-500">
                {item.genres[0] ?? 'без жанра'}
                {item.steamAppId != null ? ` · App ${item.steamAppId}` : ' · метрики: нет данных'}
              </p>
            </div>
            <span
              className="shrink-0 text-sm font-semibold text-white"
              title={item.steamAppId != null ? 'Цена. По данным SteamSpy, оценка, погрешность ±10%' : 'Метрика по SteamSpy отсутствует'}
            >
              {item.isFree || item.price <= 0 ? 'Бесплатно' : `$${item.price.toFixed(2)}`}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-white">Мониторинг игр и алерты</h1>
          <p className="mt-1 text-sm text-slate-400">
            Объединённый каталог (GOG + Epic + FreeToGame + SteamSpy): {totalResults.toLocaleString('ru-RU')} игр,
            загружено {games.length.toLocaleString('ru-RU')}, с SteamSpy-данными {matchedCount.toLocaleString('ru-RU')}
          </p>
        </div>
        <button onClick={() => void reload()} disabled={loading} className="btn-ghost h-[44px] px-[18px]">
          <svg
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
          {loading ? 'Обновление...' : 'Обновить'}
        </button>
      </div>

      <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-800/40 p-1">
        {(['catalog', 'monitoring', 'alerts'] as PageTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
        <aside className="card flex h-fit min-h-0 flex-col gap-5 p-4 lg:h-full lg:w-[280px] lg:shrink-0 lg:overflow-y-auto">
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
                className="input h-12 w-full pl-9"
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

          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Платформа</h2>
            <select
              value={filters.platform}
              onChange={(event) => setFilters((prev) => ({ ...prev, platform: event.target.value }))}
              className="input w-full bg-surface-950"
            >
              <option value="">Все платформы</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Источник</h2>
            <select
              value={filters.source}
              onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
              className="input w-full bg-surface-950"
            >
              <option value="">Все источники</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
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
            Показано: {sorted.length} из {games.length.toLocaleString('ru-RU')}
          </div>

          {filtersActive && (
            <button
              onClick={() => {
                setQuery('')
                setFilters({ genres: [], minPrice: 0, onlyMatched: false, platform: '', source: '' })
              }}
              className="btn-ghost w-full py-2 text-xs"
            >
              Сбросить фильтры
            </button>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="input h-9 w-44 bg-surface-950 text-xs"
              title="Сортировка"
            >
              <option value="relevance">Сортировка: релевантность</option>
              <option value="name">По названию</option>
              <option value="rating">По рейтингу</option>
              <option value="price">По цене</option>
              <option value="owners">По владельцам</option>
              <option value="release">По дате релиза</option>
            </select>
            <div className="flex items-center gap-2">
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
                  onClick={() => setView('compact')}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    view === 'compact' ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Компактная сетка"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="8" height="5" rx="1" />
                    <rect x="13" y="3" width="8" height="5" rx="1" />
                    <rect x="3" y="10" width="8" height="5" rx="1" />
                    <rect x="13" y="10" width="8" height="5" rx="1" />
                    <rect x="3" y="17" width="8" height="4" rx="1" />
                    <rect x="13" y="17" width="8" height="4" rx="1" />
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
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {sorted.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-700 bg-surface-800/50 text-slate-400">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </div>
                <div className="text-sm font-medium text-slate-300">Игр не найдено</div>
                <div className="text-xs text-slate-500">Попробуйте изменить фильтр</div>
                <button
                  onClick={() => {
                    setQuery('')
                    setFilters({ genres: [], minPrice: 0, onlyMatched: false, platform: '', source: '' })
                  }}
                  className="btn-ghost mt-2 py-2 text-xs"
                >
                  Сбросить
                </button>
              </div>
            ) : (<>
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
                    ? renderGridRow(virtualRow.index * colCount, colCount)
                    : renderListRow(virtualRow.index * colCount, colCount)}
                </div>
              ))}
            </div>
            {loadingMore && <div className="py-4 text-center text-sm text-slate-500">Загрузка...</div>}
            {!hasMore && (
              <div className="py-4 text-center text-xs text-slate-600">Конец каталога</div>
            )}
            </>
          )}
        </div>
      </div>
      </div>)}

      {tab === 'monitoring' && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {monitorAppId == null || !game ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-700 bg-surface-800/50 text-slate-400">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="text-sm font-medium text-slate-300">Игра для мониторинга не выбрана</div>
              <div className="text-xs text-slate-500">Откройте карточку игры и нажмите «Мониторинг и алерты»</div>
              <button onClick={() => setTab('catalog')} className="btn-ghost mt-2 py-2 text-xs">
                Перейти в каталог
              </button>
            </div>
          ) : (
          <div className="flex flex-col gap-6">
            {monitorLoading && <Spinner />}

            <div>
              <h3 className="mb-3 text-base font-bold text-white">Мониторинг: {game.name}</h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Цена"
                  value={game.currentPrice != null ? (game.currentPrice > 0 ? `$${(game.currentPrice / 100).toFixed(2)}` : 'Бесплатно') : '—'}
                  accent="blue"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <circle cx="7" cy="7" r="1" fill="currentColor" />
                    </svg>
                  }
                />
                <StatCard
                  label="Скидка, %"
                  value={game.currentDiscountPercent ?? '—'}
                  accent="green"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 12L10 12M20 12l-4-4M20 12l-4 4" />
                      <path d="M4 6h4v12H4z" />
                    </svg>
                  }
                />
                <StatCard
                  label="Отзывы, %"
                  value={game.positiveReviewPercent?.toFixed(1) ?? '—'}
                  accent="blue"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10v12M15 5.88V14M12 2v12" />
                      <path d="M3 10h4v12H3zM11 5.88h4v8.12h-4zM19 2h4v12h-4z" />
                    </svg>
                  }
                />
                <StatCard
                  label="Рейтинг"
                  value={game.positiveReviewPercent != null ? `★ ${(game.positiveReviewPercent / 20).toFixed(1)}` : '—'}
                  accent="amber"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.2l7.1-.6L12 2z" />
                    </svg>
                  }
                />
              </div>
            </div>

            <div className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-200">Тренд {game.name}: ревью и цена</h3>
                <div className="flex gap-1">
                  {([7, 30, 90, 365] as const).map((days) => (
                    <button
                      key={days}
                      onClick={() => setTrendDays(days)}
                      className={
                        days === trendDays
                          ? 'btn-primary px-3 py-1.5 text-xs'
                          : 'btn-ghost px-3 py-1.5 text-xs'
                      }
                    >
                      {days === 365 ? '1 год' : `${days} д`}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={formatTrend(cutTrend(game.trend))} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
                    <span className="shrink-0 text-xs text-slate-500" title={item.date ? new Date(item.date).toLocaleString('ru-RU') : ''}>
                      {item.date ? formatRelativeDate(item.date) : ''}
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
        </div>
      )}

      {tab === 'alerts' && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <AlertRulesPanel selectedAppId={monitorAppId ?? undefined} />
        </div>
      )}

      {selectedGame && (
        <CatalogDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onShowMonitor={() => {
              if (selectedGame.steamAppId != null) {
                void loadMonitor(selectedGame.steamAppId)
                setSelectedGame(null)
                setTab('monitoring')
              }
            }}
          onOpenDetail={() => navigate(`/games/${selectedGame.id}`, { state: { game: selectedGame } })}
        />
      )}
    </div>
  )
}
