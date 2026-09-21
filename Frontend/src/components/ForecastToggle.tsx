import { useLocale } from '@/hooks/useLocale'

interface ForecastToggleProps {
  enabled: boolean
  onToggle: () => void
}

/** Чип-кнопка «Прогноз» в стилі кнопок періоду. */
export default function ForecastToggle({ enabled, onToggle }: ForecastToggleProps) {
  const { t } = useLocale()
  return (
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      title={t.forecast.toggle}
      className={enabled ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-ghost px-3 py-1.5 text-xs'}
    >
      {t.forecast.toggle}
    </button>
  )
}
