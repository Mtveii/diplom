import { httpClient } from './httpClient'
import type {
  CatalogGameDetailDto,
  CatalogListItemDto,
  GogGameDetailsDto,
  UnifiedCatalogPageDto,
} from '@/types/catalog'

export const catalogApi = {
  list: () => httpClient.get<CatalogListItemDto[]>('/catalog').then((r) => r.data),

  game: (id: number) => httpClient.get<CatalogGameDetailDto>(`/catalog/${id}`).then((r) => r.data),

  unifiedPage: (page: number) =>
    httpClient.get<UnifiedCatalogPageDto>('/catalog2', { params: { page } }).then((r) => r.data),

  gogDetails: (url: string) =>
    httpClient.get<GogGameDetailsDto>('/catalog2/gog-details', { params: { url } }).then((r) => r.data),

  sourcesStatus: () => httpClient.get<boolean>('/catalog2/sources-status').then((r) => r.data),
}