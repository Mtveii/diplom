import { useCallback, useState } from 'react'

const WATCH_KEY = 'game-watchlist'
const MONITOR_KEY = 'game-monitored'

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return new Set()
    }
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

export function useWatchlist() {
  const [watched, setWatched] = useState<Set<string>>(() => loadSet(WATCH_KEY))
  const [monitored, setMonitored] = useState<Set<string>>(() => loadSet(MONITOR_KEY))

  const toggleWatch = useCallback((gameId: string) => {
    setWatched((prev) => {
      const next = new Set(prev)
      if (next.has(gameId)) {
        next.delete(gameId)
      } else {
        next.add(gameId)
      }
      saveSet(WATCH_KEY, next)
      return next
    })
  }, [])

  const toggleMonitor = useCallback((appId: number | null) => {
    if (appId == null) {
      return
    }
    setMonitored((prev) => {
      const key = String(appId)
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      saveSet(MONITOR_KEY, next)
      return next
    })
  }, [])

  const isWatched = useCallback((gameId: string) => watched.has(gameId), [watched])
  const isMonitored = useCallback((appId: number | null) => appId != null && monitored.has(String(appId)), [monitored])

  return { watched, monitored, toggleWatch, toggleMonitor, isWatched, isMonitored }
}
