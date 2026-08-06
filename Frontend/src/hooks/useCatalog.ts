import { useCallback, useEffect, useState } from 'react'
import { catalogApi } from '@/services/api/catalog.api'
import type { CatalogListItemDto } from '@/types/catalog'

export function useCatalog() {
  const [games, setGames] = useState<CatalogListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await catalogApi.list()
      setGames(data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { games, loading, error, reload: load }
}