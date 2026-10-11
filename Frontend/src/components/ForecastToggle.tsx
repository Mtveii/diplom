import { useLocale } from '@/hooks/useLocale'

interface ForecastToggleProps {
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
  disabledReason?: string
}

/** Чип-кнопка «Прогноз» в стилі кнопок періоду. Без даних — disabled з підказкою. */
export default function ForecastToggle({ enabled, onToggle, disabled = false, disabledReason }: ForecastToggleProps) {
  const { t } = useLocale()
  return (
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      disabled={disabled}
      title={disabled && disabledReason ? disabledReason : t.forecast.toggle}
      className={`${enabled ? 'btn-primary' : 'btn-ghost'} px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {t.forecast.toggle}
    </button>
  )
}

/** Пояснення, чому ввімкнений прогноз не намалювався: даних вистачило, але тренд ненадійний. */
export function ForecastNote({ visible }: { visible: boolean }) {
  const { t } = useLocale()
  if (!visible) {
    return null
  }
  return <p className="mt-2 text-[11px] text-slate-500">{t.forecast.unreliable}</p>
}
