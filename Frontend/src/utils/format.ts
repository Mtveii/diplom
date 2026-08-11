export function formatRelativeDate(dateStr: string, now: number = Date.now()): string {
  const diffMs = now - new Date(dateStr).getTime()
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
  return new Date(dateStr).toLocaleDateString('ru-RU')
}

export function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  if (hours >= 10000) {
    return `${(hours / 1000).toFixed(1)}K ч`
  }
  return `${hours.toLocaleString('ru-RU')} ч`
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) {
    return '—'
  }
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
