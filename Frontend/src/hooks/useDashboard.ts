import { useEffect, useState } from 'react'
import { monitoringApi } from '@/services/api/monitoring.api'
import type { DashboardSummaryDto } from '@/types/monitoring'

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await monitoringApi.summary()
        if (mounted) {
          setSummary(data)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    void load()
    const timer = window.setInterval(load, 60_000)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [])

  return { summary, loading }
}