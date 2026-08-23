import { httpClient } from './httpClient'
import type { GogGameDetailsDto, UnifiedCatalogPageDto, UnifiedGameDto } from '@/types/catalog'

/** Сырая форма игры из Slush API (CheapShark). */
interface SlushGameDto {
  id: string
  title: string | null
  source: number
  price: number
  discountPercent: number
  coverUrl: string | null
  storeUrl: string | null
}

interface SlushPagedResultDto<T> {
  items: T[] | null
  totalCount: number
  page: number
  pageSize: number
}

const SLUSH_SOURCE_NAMES = ['Steam', 'GOG', 'Epic', 'CheapShark'] as const

function mapSlushGame(game: SlushGameDto): UnifiedGameDto {
  return {
    id: game.id,
    steamAppId: null,
    name: game.title ?? 'Без названия',
    price: game.price,
    isFree: game.price === 0,
    description: null,
    image: game.coverUrl,
    gallery: [],
    developer: null,
    publisher: null,
    genres: [],
    platforms: [],
    rating: null,
    ownersEstimate: null,
    releaseDate: null,
    sourceUrls: { gog: null, epic: null, freetogame: null },
    sources: [SLUSH_SOURCE_NAMES[game.source] ?? `source-${game.source}`],
  }
}

export const catalogApi = {
  /**
   * Страница каталога из /Catalog/search. Сортировка/фильтры применяются на клиенте,
   * поэтому loadMore просто добавляет следующую серверную страницу к общему набору.
   */
  unifiedPage: async (page: number): Promise<UnifiedCatalogPageDto> => {
    const raw = await httpClient.get<SlushPagedResultDto<SlushGameDto>>('/Catalog/search', {
      params: { page, pageSize: 100 },
    }).then((r) => r.data)

    return {
      page: raw.page,
      totalPages: Math.max(1, Math.ceil(raw.totalCount / raw.pageSize)),
      totalResults: raw.totalCount,
      items: (raw.items ?? []).map(mapSlushGame),
    }
  },

  gogDetails: async (_url?: string): Promise<GogGameDetailsDto | null> => {
    console.info('[catalogApi] gogDetails: эндпоинт отсутствует в Slush API')
    return null
  },
}
