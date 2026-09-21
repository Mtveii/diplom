import { Link } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'

export default function NotFoundPage() {
  const { t } = useLocale()

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="bg-gradient-to-br from-primary-400 to-primary-600 bg-clip-text text-6xl font-extrabold text-transparent">
        {t.notFound.title}
      </div>
      <h1 className="text-base sm:text-xl font-bold text-white">{t.notFound.heading}</h1>
      <p className="text-xs sm:text-sm text-slate-400">{t.notFound.hint}</p>
      <Link to="/" className="btn-primary mt-2 h-9 px-4 text-sm">
        {t.notFound.home}
      </Link>
    </div>
  )
}
