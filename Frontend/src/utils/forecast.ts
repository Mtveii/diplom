/**
 * Прогнозування тренду: зважена лінійна регресія (МНК) + фільтр викидів +
 * оцінка надійності через R² і довірчий коридор.
 * Чисті функції без залежностей.
 */

export interface ForecastOptions {
  /** Затухання ваги свіжості wᵢ = λ^((n−1)−i). За замовчуванням 0.92. */
  lambda?: number
  /** Поріг викидів у σ від медіани. За замовчуванням 2.5. */
  outlierSigma?: number
  /** Мінімальний R², нижче — прогноз ненадійний і ховається. За замовчуванням 0.3. */
  minR2?: number
  /** Клеймінг прогнозу знизу (лічильники/ціни — 0). За замовчуванням 0. */
  min?: number
  /** Клеймінг зверху (відсотки — 100). */
  max?: number
}

export interface ForecastPoint {
  /** ISO-мітка майбутньої точки. */
  timestamp: string
  value: number
  lower: number
  upper: number
}

export interface SeriesForecast {
  label: string
  color: string
  points: ForecastPoint[]
  /** ms останньої історичної точки — межа «факт / прогноз». */
  fromTime: number
  r2: number
}

export interface BuildForecastInput {
  values: number[]
  /** ms-мітки, паралельно values. */
  times: number[]
  label: string
  color: string
  lambda?: number
  outlierSigma?: number
  minR2?: number
  min?: number
  max?: number
  /** Перевизначення: єдині горизонт/крок для кількох серій одного графіка. */
  horizon?: number
  stepMs?: number
}

/** Опис застосованого прогнозу для рендера оверлея. */
export interface AppliedForecast {
  key: string
  label: string
  color: string
  /** Вісь recharts; відсутня — вісь за замовчуванням. */
  axis?: 'percent' | 'price'
}

const DEFAULT_LAMBDA = 0.92
const DEFAULT_OUTLIER_SIGMA = 2.5
const DEFAULT_MIN_R2 = 0.3
/** 95% довірчий коридор для нормального розподілу залишків. */
const CONFIDENCE_Z = 1.96
const DAY_MS = 24 * 3600_000
const MIN_HORIZON = 3
const MAX_HORIZON = 14

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function populationStd(values: number[], avg: number): number {
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

const round2 = (value: number): number => Math.round(value * 100) / 100

/** Горизонт прогнозу: третина видимої історії, від 3 до 14 точок. */
export function forecastHorizon(count: number): number {
  if (count < 2) {
    return 0
  }
  return Math.min(MAX_HORIZON, Math.max(MIN_HORIZON, Math.round(count / 3)))
}

/** Крок сітки — медіана додатних різниць сусідніх міток. */
export function inferStepMs(times: number[]): number {
  const diffs: number[] = []
  for (let i = 1; i < times.length; i += 1) {
    const diff = times[i] - times[i - 1]
    if (diff > 0) {
      diffs.push(diff)
    }
  }
  if (diffs.length === 0) {
    return DAY_MS
  }
  diffs.sort((a, b) => a - b)
  return diffs[Math.floor(diffs.length / 2)]
}

/**
 * Будує прогноз однієї серії. Повертає null, коли даних замало
 * або модель ненадійна (R² нижче порога) — такий прогноз ховаємо.
 */
export function buildSeriesForecast(input: BuildForecastInput): SeriesForecast | null {
  const {
    values,
    times,
    label,
    color,
    lambda = DEFAULT_LAMBDA,
    outlierSigma = DEFAULT_OUTLIER_SIGMA,
    minR2 = DEFAULT_MIN_R2,
    min = 0,
    max,
  } = input

  const pairs = values
    .map((value, index) => ({ time: times[index], value }))
    .filter((pair) => Number.isFinite(pair.value) && Number.isFinite(pair.time))
  if (pairs.length < 2) {
    return null
  }

  const horizon = input.horizon ?? forecastHorizon(pairs.length)
  if (horizon <= 0) {
    return null
  }

  // 1. Фільтр викидів: далі 2.5σ від медіани — геть.
  const rawValues = pairs.map((pair) => pair.value)
  const med = median(rawValues)
  const sigma = populationStd(rawValues, mean(rawValues))
  const kept = sigma > 0 ? pairs.filter((pair) => Math.abs(pair.value - med) <= outlierSigma * sigma) : pairs
  const data = kept.length >= 2 ? kept : pairs
  const n = data.length

  // 2. Зважений МНК на відносних індексах x = 0..n−1 (стабільно чисельно).
  let sw = 0
  let swx = 0
  let swy = 0
  let swxx = 0
  let swxy = 0
  for (let i = 0; i < n; i += 1) {
    const weight = lambda ** (n - 1 - i)
    const y = data[i].value
    sw += weight
    swx += weight * i
    swy += weight * y
    swxx += weight * i * i
    swxy += weight * i * y
  }
  const denom = sw * swxx - swx * swx
  let slope = 0
  let intercept = swy / sw
  if (denom !== 0) {
    slope = (sw * swxy - swx * swy) / denom
    intercept = (swy - slope * swx) / sw
  }

  // 3. R² на відфільтрованих даних (незважений — оцінюємо саму пряму).
  const avgY = mean(data.map((pair) => pair.value))
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i += 1) {
    const fitted = slope * i + intercept
    ssRes += (data[i].value - fitted) ** 2
    ssTot += (data[i].value - avgY) ** 2
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  if (r2 < minR2) {
    return null
  }

  // 4. Довірчий коридор ±1.96σ залишків + проекція.
  const residStd = Math.sqrt(ssRes / Math.max(n - 2, 1))
  const step = input.stepMs ?? inferStepMs(data.map((pair) => pair.time))
  const lastTime = data[n - 1].time
  const clamp = (v: number): number => {
    const lo = Math.max(min, v)
    return max === undefined ? round2(lo) : round2(Math.min(max, lo))
  }
  const points: ForecastPoint[] = []
  for (let h = 1; h <= horizon; h += 1) {
    const value = slope * (n - 1 + h) + intercept
    points.push({
      timestamp: new Date(lastTime + step * h).toISOString(),
      value: clamp(value),
      lower: clamp(value - CONFIDENCE_Z * residStd),
      upper: clamp(value + CONFIDENCE_Z * residStd),
    })
  }

  return { label, color, points, fromTime: lastTime, r2: round2(r2) }
}
