import { useLocale } from '@/hooks/useLocale'
import type { GameDetailsDlcDto } from '@/types/catalog'

interface GameDetailsExtraProps {
  gameName: string
  tags: string[]
  screenshots: string[]
  dlcs: GameDetailsDlcDto[]
}

export default function GameDetailsExtra({ gameName, tags, screenshots, dlcs }: GameDetailsExtraProps) {
  const { t } = useLocale()

  return (
    <>
      {tags.length > 0 && (
        <div className="card card-hud p-5">
          <div className="card-header-hud mb-3">
            <h3 className="card-header-hud__title">{t.gameDetail.tags}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="badge border border-surface-700 bg-surface-800 text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      {screenshots.length > 0 && (
        <div className="card card-hud p-5">
          <div className="card-header-hud mb-3">
            <h3 className="card-header-hud__title">{t.catalog.screenshots}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {screenshots.map((url) => (
              <img
                key={url}
                src={url}
                alt={t.catalog.screenshotAlt(gameName)}
                loading="lazy"
                className="aspect-video w-full rounded-xl border border-surface-700/60 object-cover"
              />
            ))}
          </div>
        </div>
      )}
      {dlcs.length > 0 && (
        <div className="card card-hud p-5">
          <div className="card-header-hud mb-3">
            <h3 className="card-header-hud__title">{t.gameDetail.dlcs}</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {dlcs.map((dlc, index) => (
              <div
                key={dlc.id ?? `${dlc.title ?? 'dlc'}-${index}`}
                className="flex items-center gap-3 border-b border-surface-800/60 pb-2.5 text-sm last:border-0 last:pb-0"
              >
                {dlc.image && (
                  <img src={dlc.image} alt={dlc.title ?? gameName} loading="lazy" className="h-12 w-20 shrink-0 rounded-lg border border-surface-700/60 object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-100">{dlc.title ?? t.common.untitled}</div>
                  {dlc.description && <div className="truncate text-xs text-slate-500">{dlc.description}</div>}
                </div>
                <span className="shrink-0 text-sm font-semibold text-white">
                  {dlc.price > 0 ? `$${dlc.price.toFixed(2)}` : t.common.free}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
