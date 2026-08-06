import { CatalogMatchKind } from '@/types/catalog'
import type { CatalogListItemDto } from '@/types/catalog'

interface GameCatalogCardProps {
  game: CatalogListItemDto
  onOpen: (game: CatalogListItemDto) => void
}

function formatOwners(owners: string | null): string {
  if (!owners) {
    return 'нет данных'
  }
  return owners.replace(/\.\./g, '–')
}

function formatPrice(priceCents: number | null): string | null {
  if (priceCents == null) {
    return null
  }
  if (priceCents <= 0) {
    return 'Бесплатно'
  }
  return `$${(priceCents / 100).toFixed(2)}`
}

const STEAMSPY_HINT = 'По данным SteamSpy, оценка, погрешность ±10%'

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

export default function GameCatalogCard({ game, onOpen }: GameCatalogCardProps) {
  const matched = game.matchKind === CatalogMatchKind.MatchedWithSteamSpy
  const rating = game.positiveReviewPercent != null ? (game.positiveReviewPercent / 100) * 5 : 0
  const price = formatPrice(game.priceCents)

  return (
    <button
      onClick={() => onOpen(game)}
      className="card card-hover group flex h-[188px] flex-col overflow-hidden p-0 text-left"
    >
      <div className="relative h-[92px] shrink-0 overflow-hidden bg-surface-800">
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-surface-700">
            {game.title.slice(0, 1)}
          </div>
        )}
        {game.discountPercent != null && game.discountPercent > 0 && (
          <span className="badge absolute left-1.5 top-1.5 border-0 bg-danger-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            −{game.discountPercent}%
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-3 pb-2.5 pt-2">
        <h3 className="truncate text-sm font-semibold text-slate-100 group-hover:text-white" title={game.title}>
          {game.title}
        </h3>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="badge border border-primary-500/30 bg-primary-500/10 px-1.5 py-0.5 text-[10px] text-primary-300">
            {game.genre ?? 'без жанра'}
          </span>
          {matched && (
            <span
              className="badge border-0 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300"
              title={STEAMSPY_HINT}
            >
              онлайн: {game.ccu?.toLocaleString('ru-RU') ?? '—'}
            </span>
          )}
        </div>

        {matched ? (
          <p className="mt-1 truncate text-[11px] text-slate-500" title={STEAMSPY_HINT}>
            владельцев: {formatOwners(game.owners)}
          </p>
        ) : (
          <p className="mt-1 truncate text-[11px] text-slate-500">метрики: нет данных</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <span className="flex items-center gap-1" title={`Рейтинг по отзывам. ${STEAMSPY_HINT}`}>
            <Stars rating={rating} />
            <span className="text-[11px] text-slate-500">{rating ? rating.toFixed(1) : '—'}</span>
          </span>
          <span className="text-sm font-semibold text-white" title={matched ? `Цена. ${STEAMSPY_HINT}` : 'Метрика по SteamSpy отсутствует'}>
            {price ?? 'нет данных'}
          </span>
        </div>
      </div>
    </button>
  )
}