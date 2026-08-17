import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface PaletteItem {
  label: string
  keywords: string
  icon: JSX.Element
  action: () => void
}

const iconClass = 'h-4 w-4'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const openHandler = () => setOpen(true)
    window.addEventListener('open-command-palette', openHandler)
    return () => window.removeEventListener('open-command-palette', openHandler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const items = useMemo<PaletteItem[]>(
    () => [
      {
        label: 'Перейти на Дашборд',
        keywords: 'dashboard home главная',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" /></svg>,
        action: () => navigate('/'),
      },
      {
        label: 'Перейти на Участники',
        keywords: 'members clan players члены клана',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></svg>,
        action: () => navigate('/members'),
      },
      {
        label: 'Перейти на Заявки',
        keywords: 'applications review заявки вступить',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" /></svg>,
        action: () => navigate('/applications'),
      },
      {
        label: 'Перейти на Мониторинг игр',
        keywords: 'games catalog мониторинг игры каталог',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h4" /><path d="M14 12h.01" /><path d="M17 12h.01" /><rect x="2" y="6" width="20" height="12" rx="2" /></svg>,
        action: () => navigate('/games'),
      },
      {
        label: 'Перейти на Аналитику',
        keywords: 'analytics retention churn статистика',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 13l4-4 4 4 5-5" /></svg>,
        action: () => navigate('/analytics'),
      },
      {
        label: 'Перейти на Настройки',
        keywords: 'settings role users notifications настройки',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
        action: () => navigate('/settings'),
      },
      {
        label: 'Добавить участника',
        keywords: 'add member создать участник import',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>,
        action: () => navigate('/members'),
      },
      {
        label: 'Рассмотреть заявки',
        keywords: 'review applications pending модерация',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>,
        action: () => navigate('/applications'),
      },
      {
        label: 'Создать правило алерта',
        keywords: 'create alert rule алерт мониторинг цена',
        icon: <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
        action: () => navigate('/games'),
      },
    ],
    [navigate],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return items
    }
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.keywords.includes(q))
  }, [items, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) {
      return
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        filtered[activeIndex]?.action()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, filtered, activeIndex])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(false)
        }
      }}
    >
      <div className="w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl border border-surface-700/60 bg-surface-900/90 shadow-card backdrop-blur-md">
        <div className="flex items-center gap-3 border-b border-surface-700 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="shrink-0 rounded-md border border-surface-700 bg-surface-800 px-1.5 py-0.5 text-[10px] text-slate-500">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Ничего не найдено</div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.label}
                onClick={() => {
                  item.action()
                  setOpen(false)
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  index === activeIndex ? 'bg-primary-500/15 text-white' : 'text-slate-300'
                }`}
              >
                <span className={index === activeIndex ? 'text-primary-400' : 'text-slate-500'}>{item.icon}</span>
                {item.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
