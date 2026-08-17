import { useToastStore, type ToastType } from '@/store/toastStore'

const STYLES: Record<ToastType, { icon: JSX.Element; border: string; text: string }> = {
  success: {
    border: 'border-success-500/50',
    text: 'text-success-400',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
  error: {
    border: 'border-danger-500/50',
    text: 'text-danger-400',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
  warning: {
    border: 'border-warning-500/50',
    text: 'text-warning-400',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    ),
  },
  info: {
    border: 'border-primary-500/50',
    text: 'text-primary-400',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
}

export default function Toaster() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 lg:bottom-4">
      {toasts.map((item) => {
        const style = STYLES[item.type]
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex animate-fade-up items-start gap-3 rounded-xl border ${style.border} bg-surface-900/90 p-3.5 shadow-card backdrop-blur-md`}
          >
            <span className={`mt-0.5 shrink-0 ${style.text}`}>{style.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-100">{item.title}</div>
              {item.description && <div className="mt-0.5 text-xs text-slate-400">{item.description}</div>}
            </div>
            <button
              onClick={() => remove(item.id)}
              className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-surface-800 hover:text-slate-200"
              aria-label="Закрыть уведомление"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
