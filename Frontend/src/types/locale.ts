export type Locale = 'uk' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pl' | 'cs' | 'pt' | 'tr'

export const LOCALES: Locale[] = ['uk', 'en', 'de', 'fr', 'es', 'it', 'pl', 'cs', 'pt', 'tr']

export const DEFAULT_LOCALE: Locale = 'uk'

export const LOCALE_STORAGE_KEY = 'slush-locale'

const NATIVE_NAMES: Record<Locale, string> = {
  uk: 'Українська',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pl: 'Polski',
  cs: 'Čeština',
  pt: 'Português',
  tr: 'Türkçe',
}

export function nativeName(locale: Locale): string {
  return NATIVE_NAMES[locale]
}

/** BCP-47 теги для Intl API. */
export const DATE_LOCALE_TAG: Record<Locale, string> = {
  uk: 'uk-UA',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pl: 'pl-PL',
  cs: 'cs-CZ',
  pt: 'pt-PT',
  tr: 'tr-TR',
}

/** Локаль для String.localeCompare. */
export const COMPARE_LOCALE: Record<Locale, string> = {
  uk: 'uk',
  en: 'en',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  pl: 'pl',
  cs: 'cs',
  pt: 'pt',
  tr: 'tr',
}

export function resolveLocale(value: unknown): Locale {
  if (typeof value === 'string' && (LOCALES as string[]).includes(value)) {
    return value as Locale
  }
  return DEFAULT_LOCALE
}
