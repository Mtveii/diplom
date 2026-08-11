import { useCallback, useEffect, useState } from 'react'
import { catalogApi } from '@/services/api/catalog.api'
import type { UnifiedGameDto } from '@/types/catalog'

const PAGES_PER_BATCH = 1

export function useCatalog() {
  const [games, setGames] = useState<UnifiedGameDto[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await catalogApi.unifiedPage(1)
      setGames(data.items)
      setPage(data.page)
      setTotalPages(data.totalPages)
      setTotalResults(data.totalResults)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) {
      return
    }
    setLoadingMore(true)
    try {
      const from = page + 1
      const to = Math.min(page + PAGES_PER_BATCH, totalPages)
      const pages = await Promise.all(
        Array.from({ length: to - from + 1 }, (_, i) => catalogApi.unifiedPage(from + i)),
      )
      const last = pages[pages.length - 1]
      setGames((prev) => [...prev, ...pages.flatMap((p) => p.items)])
      setPage(last.page)
      setTotalPages(last.totalPages)
      setTotalResults(last.totalResults)
      setError(false)
    } catch {
      setError(false)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, page, totalPages])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    games,
    page,
    totalPages,
    totalResults,
    loading,
    loadingMore,
    error,
    reload,
    loadMore,
    hasMore: page < totalPages,
  }
}