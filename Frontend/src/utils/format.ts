export function formatRelativeDate(dateStr: string, now: number = Date.now()): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = now - date.getTime()
  if (diffMs < 0) return 'только что'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) {
    return `${Math.max(1, minutes)} мин назад`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} ч назад`
  }
  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `${days} дн назад`
  }
  return date.toLocaleDateString('ru-RU')
}

export function formatHours(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  const hours = Math.floor(minutes / 60)
  if (hours >= 10000) {
    return `${(hours / 1000).toFixed(1)}K ч`
  }
  return `${hours.toLocaleString('ru-RU')} ч`
}

/** Дебаунс для поиска — без внешних зависимостей */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) {
    return '—'
  }
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
