import { useEffect, useState } from 'react'

export interface MetricSnapshot {
  t: number
  sessions: number | null
  stability: number | null
}

const HISTORY_KEY = 'slush-metric-history'
const MAX_POINTS = 60

function readHistory(): MetricSnapshot[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as MetricSnapshot[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (point) =>
        point != null &&
        Number.isFinite(point.t) &&
        (point.sessions == null || Number.isFinite(point.sessions)) &&
        (point.stability == null || Number.isFinite(point.stability)),
    )
  } catch {
    return []
  }
}

/**
 * Чисте додавання знімку: новіший час — в кінець, хвіст понад ліміт ріжемо.
 * Тестується окремо, хук лише читає/пише сховище.
 */
export function pushSnapshot(history: MetricSnapshot[], snapshot: MetricSnapshot, max = MAX_POINTS): MetricSnapshot[] {
  const next = [...history, snapshot].sort((a, b) => a.t - b.t)
  return next.length > max ? next.slice(next.length - max) : next
}

/**
 * Локальна історія скалярних метрик (сесії, стабільність): бекенд історії
 * не віддає, тому копимо знімки самі. Перший візит — 1 точка (прогнозу
 * ще нема), далі лінія `N → ±%` з'являється сама.
 */
export function useMetricHistory(sessions: number | null, stability: number | null): MetricSnapshot[] {
  const [history, setHistory] = useState<MetricSnapshot[]>(() => readHistory())

  useEffect(() => {
    if (sessions == null && stability == null) {
      return
    }
    setHistory((prev) => {
      const next = pushSnapshot(prev, { t: Date.now(), sessions, stability })
      try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {
        // ignore — історія некритична
      }
      return next
    })
  }, [sessions, stability])

  return history
}
