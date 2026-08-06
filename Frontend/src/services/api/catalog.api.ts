import { httpClient } from './httpClient'
import type { CatalogGameDetailDto, CatalogListItemDto } from '@/types/catalog'

export const catalogApi = {
  list: () => httpClient.get<CatalogListItemDto[]>('/catalog').then((r) => r.data),

  game: (id: number) => httpClient.get<CatalogGameDetailDto>(`/catalog/${id}`).then((r) => r.data),
}