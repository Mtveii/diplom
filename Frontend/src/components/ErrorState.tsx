interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="card flex flex-col items-center gap-4 border-rose-800/60 bg-rose-950/20 py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-800 bg-rose-950/60 text-rose-300">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <div className="text-sm text-rose-200">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost">
          Повторить
        </button>
      )}
    </div>
  )
}
