import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export default function Modal({ open, title, onClose, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={`card-hud max-h-[85vh] w-full animate-scale-in overflow-y-auto rounded-2xl border border-surface-700/60 bg-surface-900/70 p-6 shadow-card backdrop-blur-md ${
          wide ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        <div className="card-header-hud card-header-hud--large flex items-center justify-between">
          <h2 className="card-header-hud__title">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-surface-800 hover:text-white"
            aria-label="Закрыть"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
