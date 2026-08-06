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