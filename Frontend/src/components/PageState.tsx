import type { ReactNode } from 'react'

const ICON_CLASS = 'h-8 w-8'

function EmptyIcon() {
  return (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

function OfflineIcon() {
  return (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 15.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path d="M12 20h.01" />
      <path d="M2 2l20 20" />
    </svg>
  )
}

function ForbiddenIcon() {
  return (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <path d="M12 15v2" />
    </svg>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-surface-700 bg-surface-800/50 text-slate-400">
        {icon ?? <EmptyIcon />}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-200">{title}</div>
      {description && <div className="max-w-sm text-xs text-slate-500">{description}</div>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-ghost mt-3 py-2 text-xs">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

interface PageSkeletonProps {
  variant?: 'lines' | 'cards' | 'table'
  count?: number
}

export function PageSkeleton({ variant = 'lines', count = 5 }: PageSkeletonProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-surface-800/70" />
        <div className="h-9 w-28 animate-pulse rounded-xl bg-surface-800/70" />
      </div>
      {variant === 'lines' && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-xl bg-surface-800/40"
              style={{ opacity: 1 - index * 0.12 }}
            />
          ))}
        </div>
      )}
      {variant === 'cards' && (
        <div className="grid auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-surface-700/40">
              <div className="aspect-[16/9] animate-pulse bg-surface-800/70" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-800/60" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-800/40" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-800/40" />
              </div>
            </div>
          ))}
        </div>
      )}
      {variant === 'table' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="h-9 w-56 animate-pulse rounded-xl bg-surface-800/60" />
            <div className="h-9 w-32 animate-pulse rounded-xl bg-surface-800/60" />
            <div className="h-9 w-32 animate-pulse rounded-xl bg-surface-800/60" />
          </div>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-surface-800/40" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function OfflineState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-warning-500/40 bg-warning-500/10 text-warning-400">
        <OfflineIcon />
      </div>
      <div className="mt-1 text-sm font-medium text-slate-200">Connection lost</div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-warning-400" />
        Trying to reconnect...
      </div>
    </div>
  )
}

export function ForbiddenState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-danger-500/30 bg-danger-500/10 text-danger-400">
        <ForbiddenIcon />
      </div>
      <div className="mt-1 text-sm font-medium text-slate-200">You don't have permission to access this page</div>
      <div className="text-xs text-slate-500">Обратитесь к администратору, если считаете это ошибкой</div>
    </div>
  )
}
