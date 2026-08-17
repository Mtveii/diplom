import { useWatchlist } from '@/hooks/useWatchlist'
import type { UnifiedGameDto } from '@/types/catalog'

interface GameCatalogCardProps {
  game: UnifiedGameDto
  onOpen: (game: UnifiedGameDto) => void
  compact?: boolean
}

function formatPrice(game: UnifiedGameDto): string {
  if (game.isFree || game.price <= 0) {
    return 'БЕСПЛАТНО'
  }
  return `$${game.price.toFixed(2)}`
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`
  }
  if (value >= 1_000) {
    const thousands = value / 1_000
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`
  }
  return String(value)
}

function formatOwnersCompact(owners: string | null): string {
  if (!owners) {
    return ''
  }
  const numbers = owners
    .match(/\d[\d\s,]*/g)
    ?.map((part) => parseInt(part.replace(/[\s,]/g, ''), 10))
    .filter((n) => !Number.isNaN(n))
  if (!numbers || numbers.length === 0) {
    return owners
  }
  const compact = numbers.map(compactNumber)
  return compact.length === 2 ? `${compact[0]}–${compact[1]}` : compact[0] ?? owners
}

const STEAMSPY_HINT = 'По данным SteamSpy, оценка, погрешность ±10%'

const SOURCE_COLORS: Record<string, string> = {
  gog: 'bg-fuchsia-500',
  epic: 'bg-indigo-400',
  freetogame: 'bg-emerald-400',
  steamspy: 'bg-sky-400',
}

const SOURCE_LABELS: Record<string, string> = {
  gog: 'GOG',
  epic: 'Epic',
  freetogame: 'F2G',
  steamspy: 'SteamSpy',
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-3 w-3 ${star <= Math.round(rating) ? 'text-primary-400' : 'text-surface-700'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.2l7.1-.6L12 2z" />
        </svg>
      ))}
    </span>
  )
}

export default function GameCatalogCard({ game, onOpen, compact = false }: GameCatalogCardProps) {
  const { isWatched, isMonitored, toggleWatch, toggleMonitor } = useWatchlist()
  const matched = game.steamAppId != null
  const rating = game.rating != null ? game.rating / 20 : 0
  const price = formatPrice(game)
  const genre = game.genres[0]
  const storeSources = game.sources.filter((source) => source !== 'steamspy')
  const watched = isWatched(game.id)
  const monitored = isMonitored(game.steamAppId)

  return (
    <button
      onClick={() => onOpen(game)}
      className={`card card-hover ${compact ? '' : 'card-hud card-hud--sm card-hud--inset'} group relative flex w-full flex-col overflow-hidden p-0 text-left`}
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-surface-950">
        {game.image ? (
          <img
            src={game.image}
            alt={game.name}
            loading="lazy"
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-800 to-surface-950 text-2xl font-bold text-surface-700">
            {game.name.slice(0, 1)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-950/60 via-transparent to-transparent" />

        {storeSources.length > 0 && (
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-1">
            {storeSources.map((source) => (
              <span
                key={source}
                className="flex items-center gap-1 rounded-full bg-surface-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200 backdrop-blur-sm"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${SOURCE_COLORS[source] ?? 'bg-slate-400'}`} />
                {SOURCE_LABELS[source] ?? source}
              </span>
            ))}
          </div>
        )}

        <div
          className="absolute right-2 top-2 flex gap-1.5"
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          {game.isFree && (
            <span className="rounded-md bg-success-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-surface-950">
              FREE
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={() => toggleWatch(game.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                toggleWatch(game.id)
              }
            }}
            title={watched ? 'Убрать из избранного' : 'В избранное'}
            className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all hover:scale-110 ${
              watched ? 'hud-icon-active bg-rose-500/90 text-white' : 'bg-surface-950/70 text-slate-300 hover:text-rose-300'
            }`}
          >
            <svg className={`h-3.5 w-3.5 ${watched ? 'fill-current' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </span>
        </div>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col gap-1 ${compact ? 'p-2.5' : 'p-3'}`}>
        <h3
          className={`${compact ? 'line-clamp-1 text-sm' : 'line-clamp-2 text-base'} font-semibold leading-snug text-slate-100 transition-colors group-hover:text-white`}
          title={game.name}
        >
          {game.name}
        </h3>

        {!compact && genre && <p className="truncate text-[11px] text-slate-500">{genre}</p>}

        <div className={`mt-auto flex items-end justify-between gap-2 pt-1 ${matched ? 'pr-10' : ''}`}>
          <div className="flex min-w-0 items-center gap-1.5">
            {!compact && rating > 0 && <Stars rating={rating} />}
            <span className="text-[11px] font-medium text-slate-400">{rating > 0 ? rating.toFixed(1) : '—'}</span>
            {matched && game.ownersEstimate && (
              <span className="truncate text-[10px] text-slate-500" title={STEAMSPY_HINT}>
                {formatOwnersCompact(game.ownersEstimate)}
              </span>
            )}
          </div>
          {(game.isFree || game.price > 0) && (
            <span
              className={`shrink-0 font-bold ${compact ? 'text-xs' : 'text-sm'} ${game.isFree ? 'text-success-400' : 'text-white'}`}
              title={matched ? `Цена ${STEAMSPY_HINT}` : 'Метрика по SteamSpy отсутствует'}
            >
              {price}
            </span>
          )}
        </div>

        {monitored && (
          <div className="mt-1 flex items-center gap-1.5 border-t border-surface-800 pt-1.5 text-[10px] font-medium text-success-400">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success-400" />
            Monitoring active
          </div>
        )}
      </div>

      {matched && (
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation()
            toggleMonitor(game.steamAppId)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleMonitor(game.steamAppId)
            }
          }}
          title={monitored ? 'Отключить мониторинг' : 'Включить мониторинг'}
          className={`absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-all hover:scale-110 ${
            monitored ? 'hud-icon-active bg-success-500/90 text-surface-950' : 'bg-surface-950/70 text-slate-300 hover:text-success-300'
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>
      )}
    </button>
  )
}
