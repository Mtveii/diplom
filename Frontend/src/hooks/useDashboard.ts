import { useCallback, useEffect, useState } from 'react'
import { monitoringApi } from '@/services/api/monitoring.api'
import type { DashboardSummaryDto } from '@/types/monitoring'

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await monitoringApi.summary()
      setSummary(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void load()
    const timer = window.setInterval(() => {
      if (mounted) {
        void load()
      }
    }, 60_000)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [load])

  return { summary, loading, reload: load }
}