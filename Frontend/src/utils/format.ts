import { useLocaleStore } from '@/store/localeStore'
import { cs } from '@/store/locales/cs'
import { de } from '@/store/locales/de'
import { en } from '@/store/locales/en'
import { es } from '@/store/locales/es'
import { fr } from '@/store/locales/fr'
import { it } from '@/store/locales/it'
import { pl } from '@/store/locales/pl'
import { pt } from '@/store/locales/pt'
import { tr } from '@/store/locales/tr'
import { uk } from '@/store/locales/uk'
import { DATE_LOCALE_TAG, type Locale } from '@/types/locale'

const FORMAT_DICTIONARIES = {
  uk: uk.format,
  en: en.format,
  de: de.format,
  fr: fr.format,
  es: es.format,
  it: it.format,
  pl: pl.format,
  cs: cs.format,
  pt: pt.format,
  tr: tr.format,
} as const

function activeLocale(explicit?: Locale): Locale {
  if (explicit) return explicit
  try {
    return useLocaleStore.getState().locale
  } catch {
    return 'uk'
  }
}

function formatDict(explicit?: Locale) {
  return FORMAT_DICTIONARIES[activeLocale(explicit)]
}

function dateTag(explicit?: Locale): string {
  return DATE_LOCALE_TAG[activeLocale(explicit)]
}

export function formatRelativeDate(dateStr: string, now: number = Date.now(), locale?: Locale): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  const dict = formatDict(locale)
  const diffMs = now - date.getTime()
  if (diffMs < 0) return dict.justNow
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) {
    return dict.minAgo(minutes)
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return dict.hourAgo(hours)
  }
  const days = Math.floor(hours / 24)
  if (days < 7) {
    return dict.dayAgo(days)
  }
  return date.toLocaleDateString(dateTag(locale))
}

export function formatHours(minutes: number, locale?: Locale): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  const dict = formatDict(locale)
  const hours = Math.floor(minutes / 60)
  if (hours >= 10000) {
    return dict.thousandHours((hours / 1000).toFixed(1))
  }
  return dict.hoursUnit(hours)
}

/** Коротка дата (день + місяць) для осей графіків. */
export function formatDayMonth(value: string | Date, locale?: Locale): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(dateTag(locale), { day: 'numeric', month: 'short' })
}

/** Локалізована дата без часу. */
export function formatDay(value: string | Date, locale?: Locale): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(dateTag(locale))
}

/** Локалізовані дата + час (тултіпи, дзвіночок). */
export function formatFullDateTime(value: string | Date, locale?: Locale): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(dateTag(locale))
}

/** Локалізоване число (тисячні розділювачі). */
export function formatNumber(value: number, locale?: Locale): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString(dateTag(locale))
}

/** Дебаунс для поиска — без внешних зависимостей */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function formatDateTime(dateStr: string | null, locale?: Locale): string {
  if (!dateStr) {
    return '—'
  }
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(dateTag(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
