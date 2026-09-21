import { create } from 'zustand'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, resolveLocale, type Locale } from '@/types/locale'
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

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

function readInitialLocale(): Locale {
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw) {
      return resolveLocale(raw)
    }
  } catch (err) {
    console.warn('[localeStore] localStorage недоступен — локаль за замовчуванням', err)
  }
  return DEFAULT_LOCALE
}

function syncDocumentLang(locale: Locale): void {
  try {
    document.documentElement.lang = locale
  } catch {
    // ignore — non-DOM середовище
  }
}

const initialLocale = readInitialLocale()
syncDocumentLang(initialLocale)

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: initialLocale,
  setLocale: (locale) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch (err) {
      console.warn('[localeStore] Не вдалося зберегти локаль', err)
    }
    syncDocumentLang(locale)
    set({ locale })
  },
}))

const STORE_DICTIONARIES: Record<Locale, Dictionary> = {
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

/** Словник поточної локалі поза React (сервіси, утиліти). */
export function getLocaleDictionary(): Dictionary {
  try {
    return STORE_DICTIONARIES[useLocaleStore.getState().locale] ?? uk
  } catch {
    return uk
  }
}
