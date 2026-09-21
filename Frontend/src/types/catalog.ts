export enum CatalogMatchKind {
  FreeToGameOnly = 'FreeToGameOnly',
  MatchedWithSteamSpy = 'MatchedWithSteamSpy',
}

export interface CatalogListItemDto {
  freeToGameId: number
  title: string
  thumbnail: string | null
  shortDescription: string | null
  genre: string | null
  platform: string | null
  publisher: string | null
  developer: string | null
  releaseDate: string | null
  matchKind: CatalogMatchKind
  steamAppId: number | null
  ccu: number | null
  owners: string | null
  positiveReviewPercent: number | null
  priceCents: number | null
  discountPercent: number | null
}

export interface CatalogGameDetailDto {
  game: CatalogListItemDto
  description: string | null
  minimumRequirements: string | null
  screenshots: string[]
}

export interface UnifiedSourceUrlsDto {
  gog: string | null
  epic: string | null
  freetogame: string | null
}

export interface UnifiedGameDto {
  id: string
  steamAppId: number | null
  name: string
  price: number
  isFree: boolean
  description: string | null
  image: string | null
  gallery: string[]
  developer: string | null
  publisher: string | null
  genres: string[]
  platforms: string[]
  rating: number | null
  ownersEstimate: string | null
  releaseDate: string | null
  sourceUrls: UnifiedSourceUrlsDto
  sources: string[]
}

export interface UnifiedCatalogPageDto {
  page: number
  totalPages: number
  totalResults: number
  items: UnifiedGameDto[]
}

export interface GogGameDetailsDto {
  description: string | null
  systemRequirements: string | null
}

export interface GameDetailsDlcDto {
  id: string | null
  title: string | null
  description: string | null
  image: string | null
  price: number
}

export interface GameDetailsReviewDto {
  username: string | null
  score: number | null
  text: string | null
  date: string | null
}

/** Полные детали игры: GET /api/GameCatalog/{appId} (Slush API). */
export interface GameDetailsDto {
  id: string | null
  title: string | null
  description: string | null
  thumbnail: string | null
  developer: string | null
  publisher: string | null
  releaseDate: string | null
  screenshots: string[]
  price: number
  oldPrice: number
  discountPercent: number
  tags: string[]
  dlcs: GameDetailsDlcDto[]
  averageRating: number | null
  reviews: GameDetailsReviewDto[]
}