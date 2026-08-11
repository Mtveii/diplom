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