import { useEffect, useState } from 'react'
import { catalogApi } from '@/services/api/catalog.api'
import type { GogGameDetailsDto } from '@/types/catalog'

export function useGogGameDetails(gogUrl: string | null) {
  const [details, setDetails] = useState<GogGameDetailsDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!gogUrl) {
      setDetails(null)
      setFailed(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setFailed(false)

    catalogApi
      .gogDetails(gogUrl)
      .then((data) => {
        if (!cancelled) {
          setDetails(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetails(null)
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [gogUrl])

  return { details, loading, failed }
}