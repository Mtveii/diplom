/** Панель входа Slush-Front по умолчанию (переопределяется через VITE_SLUSH_URL). */
export const DEFAULT_SLUSH_LOGIN_URL = 'https://slush-front-aqna.vercel.app/login'

/**
 * URL панели входа Slush-Front — единственная точка входа в панель
 * (своей формы логина у нас нет). Приоритет: VITE_SLUSH_URL, иначе дефолт.
 * От env принимаются только абсолютные http(s)-адреса: относительный путь
 * или опечатка приводили бы обратно на закрытые роуты, т.е. снова на 403 —
 * в этом случае тоже откатываемся на дефолт с DEV-предупреждением.
 */
export function getSlushLoginUrl(rawValue: unknown = import.meta.env.VITE_SLUSH_URL): string {
  if (typeof rawValue !== 'string' || !isAbsoluteHttpUrl(rawValue.trim())) {
    warnMisconfigured(
      typeof rawValue !== 'string' || rawValue.trim().length === 0
        ? 'VITE_SLUSH_URL не задан — использую панель входа по умолчанию'
        : `VITE_SLUSH_URL некорректен ("${String(rawValue).trim()}") — использую панель входа по умолчанию`,
    )
    return DEFAULT_SLUSH_LOGIN_URL
  }
  return rawValue.trim()
}

function isAbsoluteHttpUrl(value: string): boolean {
  if (value.length === 0) {
    return false
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function warnMisconfigured(details: string): void {
  // Подсказка только для разработчика: в проде про неверный URL скажет hint-панель.
  if (import.meta.env.DEV) {
    console.warn(`[slush] VITE_SLUSH_URL ${details}`)
  }
}
