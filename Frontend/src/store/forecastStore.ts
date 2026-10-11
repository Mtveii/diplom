import { create } from 'zustand'

const FORECAST_STORAGE_KEY = 'slush-forecast-enabled'

interface ForecastState {
  /** Мастер-тумблер прогнозов (Настройки). Выключен — прячет все прогнозы. */
  enabled: boolean
  setEnabled: (value: boolean) => void
}

function readInitialEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(FORECAST_STORAGE_KEY)
    if (raw != null) {
      return raw === '1'
    }
  } catch (err) {
    console.warn('[forecastStore] localStorage недоступен — прогнозы включены', err)
  }
  return true
}

export const useForecastStore = create<ForecastState>()((set) => ({
  enabled: readInitialEnabled(),
  setEnabled: (value) => {
    try {
      window.localStorage.setItem(FORECAST_STORAGE_KEY, value ? '1' : '0')
    } catch (err) {
      console.warn('[forecastStore] Не удалось сохранить настройку прогнозов', err)
    }
    set({ enabled: value })
  },
}))
