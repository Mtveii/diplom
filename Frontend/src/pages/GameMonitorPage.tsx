import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import AlertRulesPanel from '@/components/AlertRulesPanel'
import CatalogDetailModal from '@/components/CatalogDetailModal'
import GameCatalogCard from '@/components/GameCatalogCard'
import GameDetailsExtra from '@/components/GameDetailsExtra'
import GameMonitorTrendChart from '@/components/GameMonitorTrendChart'
import Spinner from '@/components/Spinner'
import StatCard from '@/components/StatCard'
import { catalogApi } from '@/services/api/catalog.api'
import { useAlerts } from '@/hooks/useAlerts'
import { useCatalog } from '@/hooks/useCatalog'
import { useLocale } from '@/hooks/useLocale'
import { useAuthStore } from '@/store/authStore'
import { canManageAlerts } from '@/utils/role'
import { formatDayMonth, formatNumber } from '@/utils/format'
import type { GameDetailsDto, UnifiedGameDto } from '@/types/catalog'

const LIST_ROW_HEIGHT = 68
/* Каталог полностью статичен: фиксированные ширина карточки и число колонок.
   Никакой адаптивности под экран — размер не меняется никогда. */
const CARD_WIDTH = 312
const COLUMNS_PER_ROW = 5
const CARD_BODY_HEIGHT = 212
const GRID_ROW_ESTIMATE = Math.round(CARD_WIDTH * (9 / 16)) + CARD_BODY_HEIGHT
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
      {/* Заголовок страницы */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-7 w-72 animate-pulse rounded-lg bg-surface-800/70" />
        <div className="h-[44px] w-32 animate-pulse rounded-xl bg-surface-800/70" />
      </div>

      {/* Полоса табов */}
      <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-800/40 p-1">
        {(['catalog', 'monitoring', 'alerts'] as PageTab[]).map((tab, index) => (
          <div
            key={tab}
            className={`h-9 w-28 animate-pulse rounded-lg ${index === 0 ? 'bg-primary-500/60' : 'bg-surface-800/50'}`}
          />
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
        {/* Панель фильтров */}
        <div className="hidden w-[280px] shrink-0 animate-pulse rounded-2xl bg-surface-800/50 lg:block" />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Сортировка + переключатель вида */}
          <div className="flex items-center justify-between">
            <div className="h-10 w-52 animate-pulse rounded-xl bg-surface-800/70" />
            <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-900 p-0.5">
              {[0, 1, 2].map((icon) => (
                <div key={icon} className="h-8 w-8 animate-pulse rounded-lg bg-surface-800/70" />
              ))}
            </div>
          </div>

          {/* Сетка карточек — та же геометрия, что у реального каталога */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${COLUMNS_PER_ROW}, minmax(0, ${CARD_WIDTH}px))` }}
          >
            {Array.from({ length: COLUMNS_PER_ROW * 2 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-surface-700/40">
                <div className="aspect-[16/9] w-full animate-pulse bg-surface-800/70" />
                <div className="space-y-2 p-3.5">
                  <div className="h-4 w-3/4 rounded bg-surface-800/60" />
                  <div className="h-5 w-24 rounded-md bg-surface-800/50" />
                  <div className="h-3 w-full rounded bg-surface-800/40" />
                  <div className="h-3 w-2/3 rounded bg-surface-800/40" />
                  <div className="mt-2 flex items-center justify-between border-t border-surface-800/80 pt-2">
                    <div className="h-3 w-16 rounded bg-surface-800/50" />
                    <div className="h-6 w-14 rounded-lg bg-surface-800/60" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GameMonitorPage() {
  const { games, loading, loadingMore, reload, loadMore, hasMore } = useCatalog()
  const { t, locale, compareLocale } = useLocale()
  const navigate = useNavigate()
  const tabLabels: Record<PageTab, string> = {
    catalog: t.catalog.tabCatalog,
    monitoring: t.catalog.tabMonitoring,
    alerts: t.catalog.tabAlerts,
  }

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({ genres: [], minPrice: 0, onlyMatched: false, platform: '', source: '' })
  const [view, setView] = useState<ViewMode>('grid')
  const [sort, setSort] = useState<SortKey>('relevance')
  const [tab, setTab] = useState<PageTab>('catalog')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const role = useAuthStore((state) => state.role)
  /** Правила алертов — только SuperAdmin и Admin (см. ROUTES_ACCESS). */
  const canShowAlerts = canManageAlerts(role)
  const visibleTabs = useMemo(
    () =>
      (['catalog', 'monitoring', 'alerts'] as PageTab[]).filter(
        (tabKey) => tabKey !== 'alerts' || canShowAlerts,
      ),
    [canShowAlerts],
  )

  const [selectedGame, setSelectedGame] = useState<UnifiedGameDto | null>(null)

  const [monitorAppId, setMonitorAppId] = useState<string | null>(null)
  const [details, setDetails] = useState<GameDetailsDto | null>(null)
  const [monitorLoading, setMonitorLoading] = useState(false)
  const alerts = useAlerts()

  const alertsByDay = useMemo(() => {
    const byDay = new Map<string, number>()
    const offset = new Date().getTimezoneOffset() * 60_000
    const now = Date.now()
    for (let i = 13; i >= 0; i -= 1) {
      byDay.set(new Date(now - i * 24 * 3600_000).toISOString().slice(0, 10), 0)
    }
    for (const alert of alerts.history) {
      const key = new Date(alert.triggeredAt).toISOString().slice(0, 10)
      if (byDay.has(key)) {
        byDay.set(key, (byDay.get(key) ?? 0) + 1)
      }
    }
    return Array.from(byDay, ([day, count]) => ({
      day: formatDayMonth(new Date(new Date(day).getTime() + offset), locale),
      count,
    }))
  }, [alerts.history, locale])

  const scrollRef = useRef<HTMLDivElement>(null)

  const genres = useMemo(
    () =>
      Array.from(
        new Set(games.flatMap((g) => g.genres).filter((g): g is string => Boolean(g))),
      ).sort((a, b) => a.localeCompare(b, compareLocale)),
    [games, compareLocale],
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
        return list.sort((a, b) => a.name.localeCompare(b.name, compareLocale))
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
  }, [filtered, sort, compareLocale])

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
  }, [loading, loadingMore, filtersActive, hasMore, loadMore, sorted.length, view])

  const colCount = view === 'list' ? Math.min(3, COLUMNS_PER_ROW) : COLUMNS_PER_ROW
  const rowCount = Math.ceil(sorted.length / colCount)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (view === 'list' ? LIST_ROW_HEIGHT : GRID_ROW_ESTIMATE),
    overscan: 4,
    getItemKey: (index) => `${view}:${colCount}:${sorted[index * colCount]?.id ?? index}`,
  })

  // При смене режима отображения кэш замеров сбрасывается,
  // иначе виртуализатор расставляет строки по старым высотам и они налаживают друг на друга.
  useEffect(() => {
    virtualizer.measure()
  }, [view, virtualizer])

  const toggleGenre = useCallback((genre: string) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }))
  }, [])

  const loadMonitor = useCallback(async (id: string) => {
    setMonitorAppId(id)
    setMonitorLoading(true)
    try {
      setDetails(await catalogApi.gameDetails(id))
    } catch (err) {
      console.warn('[GameMonitorPage] Не удалось загрузить данные игры — показываю пустые данные', err)
      setDetails(null)
    } finally {
      setMonitorLoading(false)
    }
  }, [])

  const handleOpen = useCallback(
    (item: UnifiedGameDto) => {
      setSelectedGame(item)
      void loadMonitor(item.id)
    },
    [loadMonitor],
  )

  if (loading) {
    return <CatalogGridSkeleton />
  }

  const renderGridRow = (start: number, count: number) => {
    const rowItems = sorted.slice(start, start + count)
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, ${CARD_WIDTH}px))` }}>
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
            className="group card card-hover flex h-[56px] items-center gap-3 overflow-hidden p-0 pr-4 text-left"
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
              <p className="truncate text-xs text-slate-400">
                {item.genres[0] ?? t.catalog.noGenre}
                {item.steamAppId != null ? ` · App ${item.steamAppId}` : t.catalog.noMetricsSuffix}
              </p>
            </div>
            <span
              className="shrink-0 text-sm font-semibold text-white"
              title={item.steamAppId != null ? t.catalog.priceTitle(t.catalog.steamspyHint) : t.catalog.noSteamspyMetrics}
            >
              {item.isFree || item.price <= 0 ? t.common.free : `$${item.price.toFixed(2)}`}
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
          <h1 className="text-[26px] font-bold leading-tight text-white">{t.catalog.title}</h1>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-surface-700 bg-surface-800/40 p-1">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
      <div className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
        <button
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="btn-ghost lg:hidden"
          aria-expanded={filtersOpen}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
          </svg>
          {t.catalog.filters}
          {filtersActive && <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />}
          <svg
            className={`h-4 w-4 text-slate-500 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <aside
          className={`card flex h-fit min-h-0 flex-col gap-5 p-4 lg:h-full lg:w-[280px] lg:shrink-0 lg:overflow-y-auto ${
            filtersOpen ? '' : 'hidden lg:flex'
          }`}
        >          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t.catalog.search}</h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.catalog.searchPh}
              className="input h-12 w-full px-3"
            />
          </div>

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t.catalog.genres}</h2>
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
              {genres.map((g) => (
                <label key={g} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-300 transition-colors hover:bg-surface-800">
                  <input
                    type="checkbox"
                    checked={filters.genres.includes(g)}
                    onChange={() => toggleGenre(g)}
                    className="h-4 w-4 rounded border-surface-600 bg-surface-950 accent-primary-500"
                  />
                  <span className="truncate">{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.catalog.minPrice(`$${filters.minPrice.toFixed(0)}`)}
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
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t.catalog.platform}</h2>
            <select
              value={filters.platform}
              onChange={(event) => setFilters((prev) => ({ ...prev, platform: event.target.value }))}
              className="input w-full bg-surface-950"
            >
              <option value="">{t.catalog.allPlatforms}</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t.catalog.source}</h2>
            <select
              value={filters.source}
              onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
              className="input w-full bg-surface-950"
            >
              <option value="">{t.catalog.allSources}</option>
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
                className="h-4 w-4 rounded border-surface-600 bg-surface-950 accent-primary-500"
              />
              {t.catalog.onlySpy}
            </label>
          </div>

          <div className="text-xs text-slate-500">
            {t.catalog.shownOf(sorted.length, formatNumber(games.length, locale))}
          </div>

          {filtersActive && (
            <button
              onClick={() => {
                setQuery('')
                setFilters({ genres: [], minPrice: 0, onlyMatched: false, platform: '', source: '' })
              }}
              className="btn-ghost w-full py-2 text-xs"
            >
              {t.catalog.resetFilters}
            </button>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="input h-10 w-52 bg-surface-950 text-sm"
              title={t.catalog.sortTitle}
            >
              <option value="relevance">{t.catalog.sortRelevance}</option>
              <option value="name">{t.catalog.sortName}</option>
              <option value="rating">{t.catalog.sortRating}</option>
              <option value="price">{t.catalog.sortPrice}</option>
              <option value="owners">{t.catalog.sortOwners}</option>
              <option value="release">{t.catalog.sortRelease}</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-xl border border-surface-700 bg-surface-900 p-0.5">
                <button
                  onClick={() => setView('grid')}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    view === 'grid' ? 'bg-primary-500 text-surface-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={t.catalog.viewGrid}
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
                  title={t.catalog.viewCompact}
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
                  title={t.catalog.viewList}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="4" width="18" height="4" rx="1" />
                    <rect x="3" y="10" width="18" height="4" rx="1" />
                    <rect x="3" y="16" width="18" height="4" rx="1" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => void reload()}
                disabled={loading}
                className="btn-ghost inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm"
              >
                <svg
                  className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
                </svg>
                <span className="whitespace-nowrap">{loading ? t.common.updating : t.common.refresh}</span>
              </button>
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
                <div className="text-sm font-medium text-slate-300">{t.catalog.noGames}</div>
                <div className="text-xs text-slate-500">{t.catalog.tryFilter}</div>
                <button
                  onClick={() => {
                    setQuery('')
                    setFilters({ genres: [], minPrice: 0, onlyMatched: false, platform: '', source: '' })
                  }}
                  className="btn-ghost mt-2 py-2 text-xs"
                >
                  {t.common.reset}
                </button>
              </div>
            ) : (<>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualRow) => (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: view === 'grid' ? 16 : 12,
                    paddingRight: view === 'grid' ? 0 : 12,
                  }}
                >
                  {view === 'grid'
                    ? renderGridRow(virtualRow.index * colCount, colCount)
                    : renderListRow(virtualRow.index * colCount, colCount)}
                </div>
              ))}
            </div>
            {loadingMore && <div className="py-4 text-center text-sm text-slate-500">{t.common.loading}</div>}
            {!hasMore && (
              <div className="py-4 text-center text-xs text-slate-600">{t.catalog.endOfCatalog}</div>
            )}
            </>
          )}
        </div>
      </div>
      </div>)}

      {tab === 'monitoring' && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {monitorAppId == null || !details ? (
            monitorLoading ? (
              <Spinner />
            ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-700 bg-surface-800/50 text-slate-400">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="text-sm font-medium text-slate-300">{t.catalog.noMonitorGame}</div>
              <div className="text-xs text-slate-500">{t.catalog.openCardHint}</div>
              <button onClick={() => setTab('catalog')} className="btn-ghost mt-2 py-2 text-xs">
                {t.catalog.toCatalog}
              </button>
            </div>
            )
          ) : (
          <div className="flex flex-col gap-6">
            {monitorLoading && <Spinner />}

            <div>
              <h3 className="mb-3 text-base font-bold text-white">{t.catalog.monitoringOf(details.title ?? games.find((g) => g.id === monitorAppId)?.name ?? '—')}</h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label={t.catalog.statPrice}
                  value={details.price > 0 ? `$${details.price.toFixed(2)}` : t.common.free}
                  accent="blue"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <circle cx="7" cy="7" r="1" fill="currentColor" />
                    </svg>
                  }
                />
                <StatCard
                  label={t.catalog.statDiscount}
                  value={`${details.discountPercent}%`}
                  accent="green"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 12L10 12M20 12l-4-4M20 12l-4 4" />
                      <path d="M4 6h4v12H4z" />
                    </svg>
                  }
                />
                <StatCard
                  label={t.gameDetail.oldPrice}
                  value={details.oldPrice > 0 ? `$${details.oldPrice.toFixed(2)}` : '—'}
                  accent="blue"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10v12M15 5.88V14M12 2v12" />
                      <path d="M3 10h4v12H3zM11 5.88h4v8.12h-4zM19 2h4v12h-4z" />
                    </svg>
                  }
                />
                <StatCard
                  label={t.catalog.statRating}
                  value={details.averageRating != null ? details.averageRating.toFixed(1) : '—'}
                  accent="amber"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.2l7.1-.6L12 2z" />
                    </svg>
                  }
                />
              </div>
            </div>

            {details.description && (
              <div className="card card-hud p-5">
                <div className="card-header-hud mb-2">
                  <h3 className="card-header-hud__title">{t.gameDetail.description}</h3>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{details.description}</p>
              </div>
            )}

          <GameDetailsExtra
            gameName={details.title ?? games.find((g) => g.id === monitorAppId)?.name ?? ''}
            tags={details.tags}
            screenshots={details.screenshots}
            dlcs={details.dlcs}
          />
          <div>
            <button
              onClick={() => {
                const item = games.find((g) => g.id === monitorAppId)
                if (item) {
                  navigate(`/games/${item.id}`, { state: { game: item } })
                }
              }}
              className="btn-ghost h-9 px-4 text-sm"
            >
              {t.catalog.fullPage}
            </button>
          </div>
        </div>
          )}
        </div>
      )}

      {tab === 'alerts' && canShowAlerts && (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain pr-1">
          <GameMonitorTrendChart alertsByDay={alertsByDay} />
          <AlertRulesPanel selectedAppId={monitorAppId ?? undefined} />
        </div>
      )}

      {selectedGame && (
        <CatalogDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onShowMonitor={() => {
              setSelectedGame(null)
              setTab('monitoring')
            }}
          onOpenDetail={() => navigate(`/games/${selectedGame.id}`, { state: { game: selectedGame } })}
        />
      )}
    </div>
  )
}
