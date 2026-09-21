import { useEffect, useRef, useState } from 'react'
import { LOCALES, nativeName } from '@/types/locale'
import { useLocale } from '@/hooks/useLocale'

interface LanguageSwitcherProps {
  compact?: boolean
}

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open ])

  const pick = (item: (typeof LOCALES)[number]) => {
    setLocale(item)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`lang-switcher${compact ? ' lang-switcher--compact' : ''}`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.switcher.language}
        title={`${t.switcher.language}: ${nativeName(locale)}`}
        className="lang-switcher__trigger"
      >
        <span className="lang-switcher__code">{locale.toUpperCase()}</span>
        <svg
          className={`lang-switcher__chevron${open ? ' lang-switcher__chevron--open' : ''}`}
          viewBox="0 0 12 12"
          width="10"
          height="10"
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={t.switcher.language} className="lang-switcher__menu">
          {LOCALES.map((item) => (
            <li key={item} role="option" aria-selected={item === locale}>
              <button
                type="button"
                onClick={() => pick(item)}
                className={`lang-switcher__item${item === locale ? ' lang-switcher__item--active' : ''}`}
              >
                <span className="lang-switcher__name">{nativeName(item)}</span>
                {item === locale && (
                  <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                    <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
