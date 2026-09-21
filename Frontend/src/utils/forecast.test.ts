import { describe, expect, it } from 'vitest'
import { buildSeriesForecast, forecastHorizon, inferStepMs } from './forecast'

const DAY = 24 * 3600_000

function times(count: number, step = DAY): number[] {
  return Array.from({ length: count }, (_, index) => index * step)
}

describe('forecastHorizon', () => {
  it('returns 0 when fewer than 2 points', () => {
    expect(forecastHorizon(0)).toBe(0)
    expect(forecastHorizon(1)).toBe(0)
  })

  it('clamps between 3 and 14', () => {
    expect(forecastHorizon(7)).toBe(3)
    expect(forecastHorizon(30)).toBe(10)
    expect(forecastHorizon(100)).toBe(14)
  })
})

describe('inferStepMs', () => {
  it('takes the median positive step', () => {
    expect(inferStepMs([0, DAY, 2 * DAY, 3 * DAY])).toBe(DAY)
  })

  it('falls back to a day without usable diffs', () => {
    expect(inferStepMs([100, 100])).toBe(DAY)
    expect(inferStepMs([])).toBe(DAY)
  })
})

describe('buildSeriesForecast', () => {
  it('returns null with fewer than 2 points', () => {
    expect(buildSeriesForecast({ values: [5], times: [0], label: 't', color: 'c' })).toBeNull()
  })

  it('follows a clean linear trend with high R²', () => {
    const values = [100, 105, 103, 112, 118, 121, 127]
    const result = buildSeriesForecast({ values, times: times(values.length), label: 't', color: 'c' })
    expect(result).not.toBeNull()
    expect(result!.r2).toBeGreaterThan(0.9)
    expect(result!.points.length).toBeGreaterThan(0)
    expect(result!.points[0].value).toBeGreaterThan(values[values.length - 1] - 10)
    for (const point of result!.points) {
      expect(point.lower).toBeLessThanOrEqual(point.value)
      expect(point.upper).toBeGreaterThanOrEqual(point.value)
    }
  })

  it('produces a flat line for constant data', () => {
    const result = buildSeriesForecast({ values: [50, 50, 50, 50], times: times(4), label: 't', color: 'c' })
    expect(result).not.toBeNull()
    expect(result!.r2).toBe(1)
    for (const point of result!.points) {
      expect(point.value).toBe(50)
    }
  })

  it('filters a single spike as an outlier', () => {
    const result = buildSeriesForecast({
      values: [10, 11, 10, 500, 12, 11],
      times: times(6),
      label: 't',
      color: 'c',
    })
    expect(result).not.toBeNull()
    expect(result!.points[0].value).toBeLessThan(50)
  })

  it('hides pure noise below the R² threshold', () => {
    const result = buildSeriesForecast({
      values: [5, 95, 10, 90, 15, 85, 20, 80],
      times: times(8),
      label: 't',
      color: 'c',
    })
    expect(result).toBeNull()
  })

  it('clamps negative values at zero by default', () => {
    const result = buildSeriesForecast({
      values: [30, 20, 10],
      times: times(3),
      label: 't',
      color: 'c',
    })
    expect(result).not.toBeNull()
    for (const point of result!.points) {
      expect(point.value).toBeGreaterThanOrEqual(0)
      expect(point.lower).toBeGreaterThanOrEqual(0)
    }
  })

  it('respects an explicit horizon and step', () => {
    const result = buildSeriesForecast({
      values: [1, 2, 3, 4, 5, 6],
      times: times(6, 3600_000),
      label: 't',
      color: 'c',
      horizon: 2,
      stepMs: 3600_000,
    })
    expect(result).not.toBeNull()
    expect(result!.points).toHaveLength(2)
    expect(new Date(result!.points[1].timestamp).getTime() - new Date(result!.points[0].timestamp).getTime()).toBe(
      3600_000,
    )
  })

  it('clamps percents into 0..100', () => {
    const result = buildSeriesForecast({
      values: [95, 96, 97, 98, 99, 99.5],
      times: times(6),
      label: 't',
      color: 'c',
      min: 0,
      max: 100,
    })
    expect(result).not.toBeNull()
    for (const point of result!.points) {
      expect(point.value).toBeLessThanOrEqual(100)
      expect(point.upper).toBeLessThanOrEqual(100)
    }
  })
})
