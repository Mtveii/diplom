import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown): void {
    console.error('[ErrorBoundary]', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-lg font-bold text-white">Что-то пошло не так</h2>
          <p className="max-w-md text-sm text-slate-400">{this.state.error?.message ?? 'Неизвестная ошибка'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-primary"
          >
            Попробовать снова
          </button>
          <button onClick={() => window.location.reload()} className="btn-ghost">
            Перезагрузить страницу
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
