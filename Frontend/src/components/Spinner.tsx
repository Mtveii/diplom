interface SpinnerProps {
  label?: string
  fullPage?: boolean
}

export default function Spinner({ label, fullPage }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${fullPage ? 'min-h-[60vh]' : 'py-16'}`}>
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-surface-700 border-t-primary-400" />
        <div className="absolute inset-1.5 animate-spin rounded-full border-2 border-transparent border-t-accent-400 [animation-direction:reverse] [animation-duration:1.2s]" />
      </div>
      {label && <div className="text-xs text-slate-400">{label}</div>}
    </div>
  )
}
