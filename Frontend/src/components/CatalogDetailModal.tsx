import Modal from '@/components/Modal'
import { CatalogMatchKind } from '@/types/catalog'
import type { CatalogGameDetailDto, CatalogListItemDto } from '@/types/catalog'

interface CatalogDetailModalProps {
  game: CatalogListItemDto
  detail: CatalogGameDetailDto | null
  loading: boolean
  onClose: () => void
  onShowMonitor: () => void
}

function formatOwners(owners: string | null): string {
  if (!owners) {
    return '—'
  }
  return owners.replace(/\.\./g, '–')
}

export default function CatalogDetailModal({
  game,
  detail,
  loading,
  onClose,
  onShowMonitor,
}: CatalogDetailModalProps) {
  const matched = game.matchKind === CatalogMatchKind.MatchedWithSteamSpy

  return (
    <Modal open onClose={onClose} title={game.title} wide>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          {game.thumbnail && (
            <img
              src={game.thumbnail}
              alt={game.title}
              className="h-40 w-full rounded-xl border border-surface-700/60 object-cover sm:w-64"
            />
          )}
          <div className="flex flex-1 flex-col gap-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="badge border border-surface-700 bg-surface-800/60 text-slate-300">
                {game.genre ?? 'без жанра'}
              </span>
              <span className="badge border border-surface-700 bg-surface-800/60 text-slate-300">
                {game.platform ?? 'платформа n/a'}
              </span>
              {matched && (
                <span className="badge border-0 bg-emerald-500/90 text-white" title="По данным SteamSpy, оценка, погрешность ±10%">
                  SteamSpy: онлайн {game.ccu?.toLocaleString('ru-RU') ?? '—'}
                </span>
              )}
              {!matched && (
                <span className="badge border border-surface-700 bg-surface-800/60 text-slate-300" title="Совпадение в SteamSpy не найдено">
                  SteamSpy: нет данных
                </span>
              )}
            </div>
            <p className="text-slate-300">{game.shortDescription ?? 'Нет описания'}</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-slate-400 sm:grid-cols-2">
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Разработчик</dt>
                <dd className="text-right">{game.developer ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Издатель</dt>
                <dd className="text-right">{game.publisher ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Релиз</dt>
                <dd className="text-right">{game.releaseDate ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500" title="По данным SteamSpy, оценка, погрешность ±10%">Владельцев</dt>
                <dd className="text-right">{matched ? formatOwners(game.owners) : 'нет данных'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500" title="По данным SteamSpy, оценка, погрешность ±10%">Положительных, %</dt>
                <dd className="text-right">
                  {matched && game.positiveReviewPercent != null
                    ? `${game.positiveReviewPercent.toFixed(1)}%`
                    : 'нет данных'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500" title="По данным SteamSpy, оценка, погрешность ±10%">Цена</dt>
                <dd className="text-right">
                  {game.priceCents == null
                    ? 'нет данных'
                    : game.priceCents > 0
                      ? `$${(game.priceCents / 100).toFixed(2)}${game.discountPercent != null && game.discountPercent > 0 ? ` (−${game.discountPercent}%)` : ''}`
                      : 'Бесплатно'}
                </dd>
              </div>
            </dl>
            {matched && game.steamAppId != null && (
              <button onClick={onShowMonitor} className="btn-primary mt-2 self-start">
                Мониторинг и алерты (App {game.steamAppId})
              </button>
            )}
          </div>
        </div>

        {loading && <div className="py-6 text-center text-sm text-slate-500">Загрузка деталей...</div>}

        {!loading && detail && (
          <>
            {detail.description && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-200">Описание</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">{detail.description}</p>
              </div>
            )}

            {detail.minimumRequirements && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-200">Системные требования</h3>
                <pre className="whitespace-pre-wrap rounded-xl border border-surface-700 bg-surface-950/60 p-3 font-sans text-xs leading-relaxed text-slate-400">
                  {detail.minimumRequirements}
                </pre>
              </div>
            )}

            {detail.screenshots.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-200">Скриншоты</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {detail.screenshots.map((screenshot) => (
                    <img
                      key={screenshot}
                      src={screenshot}
                      alt={`Скриншот ${game.title}`}
                      loading="lazy"
                      className="aspect-video w-full rounded-xl border border-surface-700/60 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}