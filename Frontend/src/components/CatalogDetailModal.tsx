import Modal from '@/components/Modal'
import { useGogGameDetails } from '@/hooks/useGogGameDetails'
import type { UnifiedGameDto } from '@/types/catalog'

interface CatalogDetailModalProps {
  game: UnifiedGameDto
  onClose: () => void
  onShowMonitor: () => void
  onOpenDetail?: () => void
}

function formatOwners(owners: string | null): string {
  if (!owners) {
    return '—'
  }
  return owners.replace(/\.\./g, '–')
}

const REQ_LABELS: Record<string, string> = {
  os: 'ОС',
  cpu: 'Процессор',
  processor: 'Процессор',
  memory: 'Память',
  ram: 'Память',
  graphics: 'Видеокарта',
  gpu: 'Видеокарта',
  video: 'Видеокарта',
  directx: 'DirectX',
  storage: 'Диск',
  'hard drive': 'Диск',
  'sound card': 'Звук',
  'other requirements': 'Другое',
  other: 'Другое',
}

const REQ_LABEL_PATTERN = /^([A-Za-zА-Яа-яЁё][^:：]{1,24}?)\s*[:：]\s*(.+)$/

function GogRequirements({ text }: { text: string }) {
  const rows: Array<{ label: string; value: string }> = []
  const notes: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      continue
    }
    const match = REQ_LABEL_PATTERN.exec(line)
    const label = match ? REQ_LABELS[match[1].trim().toLowerCase()] : undefined
    if (match && label) {
      rows.push({ label, value: match[2].trim() })
    } else {
      notes.push(line)
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-3 rounded-lg border border-surface-700/40 bg-surface-900/40 px-3 py-1.5 text-xs"
            >
              <span className="shrink-0 font-semibold uppercase tracking-wide text-slate-500">{row.label}</span>
              <span className="text-right text-slate-300">{row.value}</span>
            </div>
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">{notes.join('\n')}</p>
      )}
    </div>
  )
}

const SOURCE_LABELS: Record<string, string> = {
  gog: 'GOG',
  epic: 'Epic Games',
  freetogame: 'FreeToGame',
  steamspy: 'SteamSpy',
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'text-primary-400' : 'text-surface-700'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.2l7.1-.6L12 2z" />
        </svg>
      ))}
    </span>
  )
}

export default function CatalogDetailModal({ game, onClose, onShowMonitor, onOpenDetail }: CatalogDetailModalProps) {
  const matched = game.steamAppId != null
  const rating = game.rating != null ? game.rating / 20 : 0
  const { details: gogDetails, loading: gogLoading, failed: gogFailed } = useGogGameDetails(game.sourceUrls.gog)

  return (
    <Modal open onClose={onClose} title={game.name} wide>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="shrink-0 sm:w-64">
            {game.image ? (
              <img
                src={game.image}
                alt={game.name}
                className="mx-auto w-full rounded-xl border border-surface-700/60 bg-surface-900 object-contain p-2"
              />
            ) : (
              <div className="flex aspect-[342/482] w-full items-center justify-center rounded-xl border border-surface-700/60 bg-surface-900 text-3xl font-bold text-surface-700">
                {game.name.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              {rating > 0 && (
                <>
                  <Stars rating={rating} />
                  <span className="text-sm font-bold text-white">{rating.toFixed(1)}</span>
                </>
              )}
              <span title="По данным SteamSpy, оценка, погрешность ±10%">
                {formatOwners(game.ownersEstimate)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(game.genres.length > 0 ? game.genres : ['без жанра']).map((genre) => (
                <span key={genre} className="badge border border-surface-700 bg-surface-800/60 text-slate-300">
                  {genre}
                </span>
              ))}
              <span className="badge border border-surface-700 bg-surface-800/60 text-slate-300">
                {game.platforms.length > 0 ? game.platforms.join(' / ') : 'платформа n/a'}
              </span>
              {matched && (
                <span className="badge border-0 bg-emerald-500/90 text-white" title="По данным SteamSpy, оценка, погрешность ±10%">
                  Steam App {game.steamAppId}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {game.sources.map((source) => (
                <span
                  key={source}
                  className="badge border-0 bg-primary-500/15 px-1.5 py-0.5 text-[10px] text-primary-300"
                >
                  Источник: {SOURCE_LABELS[source] ?? source}
                </span>
              ))}
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-surface-700/40 bg-surface-900/40 p-3 pr-1">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{game.description ?? 'Нет описания'}</p>
            </div>
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
                <dd className="text-right">{matched ? formatOwners(game.ownersEstimate) : 'нет данных'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500" title="По данным SteamSpy, оценка, погрешность ±10%">Рейтинг</dt>
                <dd className="text-right">
                  {matched && game.rating != null
                    ? `★ ${(game.rating / 20).toFixed(1)}`
                    : 'нет данных'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-slate-500" title="По данным SteamSpy, оценка, погрешность ±10%">Цена</dt>
                <dd className="text-right">
                  {game.isFree || game.price <= 0 ? 'Бесплатно' : `$${game.price.toFixed(2)}`}
                </dd>
              </div>
            </dl>
            {matched && game.steamAppId != null && (
              <button onClick={onShowMonitor} className="btn-primary mt-2 self-start">
                Мониторинг и алерты (App {game.steamAppId})
              </button>
            )}
            {onOpenDetail && (
              <button onClick={onOpenDetail} className="btn-ghost mt-2 self-start">
                Полная страница игры
              </button>
            )}
          </div>
        </div>

        {(game.sourceUrls.gog || game.sourceUrls.freetogame || matched) && (
          <div className="flex flex-wrap gap-2">
            {matched && (
              <a
                href={`https://store.steampowered.com/app/${game.steamAppId}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                Открыть в Steam
              </a>
            )}
            {game.sourceUrls.gog && (
              <a href={game.sourceUrls.gog} target="_blank" rel="noreferrer" className="btn-ghost">
                Открыть на GOG
              </a>
            )}
            {game.sourceUrls.freetogame && (
              <a href={game.sourceUrls.freetogame} target="_blank" rel="noreferrer" className="btn-ghost">
                Открыть на FreeToGame
              </a>
            )}
          </div>
        )}

        {gogLoading && (
          <p className="text-xs text-slate-500">Загружаем детали со страницы GOG…</p>
        )}

        {!gogLoading && gogDetails?.description && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
              Описание (GOG)
            </h3>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-surface-700/40 bg-surface-900/40 p-3.5 pr-1">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{gogDetails.description}</p>
            </div>
          </div>
        )}

        {!gogLoading && gogDetails?.systemRequirements && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Системные требования (GOG)
            </h3>
            <GogRequirements text={gogDetails.systemRequirements} />
          </div>
        )}

        {!gogLoading && gogFailed && (
          <p className="text-xs text-slate-500">Детали GOG временно недоступны</p>
        )}

        {game.gallery.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Скриншоты</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {game.gallery.map((screenshot) => (
                <img
                  key={screenshot}
                  src={screenshot}
                  alt={`Скриншот ${game.name}`}
                  loading="lazy"
                  className="aspect-video w-full rounded-xl border border-surface-700/60 object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}