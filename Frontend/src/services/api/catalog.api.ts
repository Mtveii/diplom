import { httpClient } from './httpClient'
import { getLocaleDictionary } from '@/store/localeStore'
import type { GameDetailsDto, GogGameDetailsDto, UnifiedCatalogPageDto, UnifiedGameDto } from '@/types/catalog'

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
    name: game.title ?? getLocaleDictionary().common.untitled,
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

  /** Полные детали игры: описание, скрины, теги, DLC, цены, рейтинг, отзывы. */
  gameDetails: async (appId: string): Promise<GameDetailsDto | null> => {
    interface SlushScreenshotDto {
      image: string | null
    }
    interface SlushDlcDto {
      id: string | null
      title: string | null
      description: string | null
      image: string | null
      price: number
    }
    interface SlushReviewDto {
      username: string | null
      score: number | null
      text: string | null
      date: string | null
    }
    interface SlushGameDetailsDto {
      id: string | null
      title: string | null
      description: string | null
      thumbnail: string | null
      developer: string | null
      publisher: string | null
      releaseDate: string | null
      screenshots: SlushScreenshotDto[] | null
      price: number
      oldPrice: number
      discountPercent: number
      tags: string[] | null
      dlCs: SlushDlcDto[] | null
      averageRating: number | null
      reviews: SlushReviewDto[] | null
    }
    try {
      const raw = await httpClient.get<SlushGameDetailsDto>(`/GameCatalog/${appId}`).then((r) => r.data)
      return {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        thumbnail: raw.thumbnail,
        developer: raw.developer,
        publisher: raw.publisher,
        releaseDate: raw.releaseDate,
        screenshots: (raw.screenshots ?? []).map((s) => s.image).filter((url): url is string => url != null),
        price: raw.price,
        oldPrice: raw.oldPrice,
        discountPercent: raw.discountPercent,
        tags: raw.tags ?? [],
        dlcs: (raw.dlCs ?? []).map((dlc) => ({
          id: dlc.id,
          title: dlc.title,
          description: dlc.description,
          image: dlc.image,
          price: dlc.price,
        })),
        averageRating: raw.averageRating,
        reviews: (raw.reviews ?? []).map((review) => ({
          username: review.username,
          score: review.score,
          text: review.text,
          date: review.date,
        })),
      }
    } catch (err) {
      console.warn('[catalogApi] Не удалось загрузить детали игры', err)
      return null
    }
  },
}
