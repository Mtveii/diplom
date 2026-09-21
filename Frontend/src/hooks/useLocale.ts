import { useLocaleStore } from '@/store/localeStore'
import { COMPARE_LOCALE, DATE_LOCALE_TAG, type Locale } from '@/types/locale'
import { cs } from '@/store/locales/cs'
import { de } from '@/store/locales/de'
import { en } from '@/store/locales/en'
import { es } from '@/store/locales/es'
import { fr } from '@/store/locales/fr'
import { it } from '@/store/locales/it'
import { pl } from '@/store/locales/pl'
import { pt } from '@/store/locales/pt'
import { tr } from '@/store/locales/tr'
import { uk, type Dictionary } from '@/store/locales/uk'

export const DICTIONARIES: Record<Locale, Dictionary> = {
  uk,
  en,
  de,
  fr,
  es,
  it,
  pl,
  cs,
  pt,
  tr,
}

export function useLocale() {
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)
  return {
    locale,
    setLocale,
    t: DICTIONARIES[locale],
    dateLocale: DATE_LOCALE_TAG[locale],
    compareLocale: COMPARE_LOCALE[locale],
  }
}
