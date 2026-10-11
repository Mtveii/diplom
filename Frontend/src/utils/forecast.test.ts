import { describe, expect, it } from 'vitest'
import { buildSeriesForecast, deltaForSeries, forecastDirection, forecastHorizon, inferStepMs, withForecastRange } from './forecast'

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

describe('forecastDirection', () => {
  const fc = (lastValue: number) => ({
    label: 't',
    color: 'c',
    fromTime: 0,
    r2: 0.9,
    points: [{ timestamp: 'x', value: lastValue, lower: lastValue - 1, upper: lastValue + 1 }],
  })

  it('detects up and down with percents', () => {
    expect(forecastDirection([100, 100], fc(112))).toEqual({ direction: 'up', percent: 12, target: 112 })
    expect(forecastDirection([200, 200], fc(150))).toEqual({ direction: 'down', percent: -25, target: 150 })
  })

  it('reports flat on tiny changes', () => {
    expect(forecastDirection([1000, 1000], fc(1002))?.direction).toBe('flat')
  })

  it('returns null without forecast, data or on zero base', () => {
    expect(forecastDirection([1, 2], null)).toBeNull()
    expect(forecastDirection([], fc(5))).toBeNull()
    expect(forecastDirection([0, 0], fc(5))).toBeNull()
  })

  it('shows flat zero percent when nothing changes from zero', () => {
    expect(forecastDirection([0, 0, 0], fc(0))).toEqual({ direction: 'flat', percent: 0, target: 0 })
  })
})

describe('withForecastRange', () => {
  it('appends future points without touching history', () => {
    const rows = [
      { day: 'd1', count: 3 },
      { day: 'd2', count: 5 },
    ]
    const out = withForecastRange(rows, 'day', 'countF', {
      label: 't',
      color: 'c',
      fromTime: 0,
      r2: 0.9,
      points: [{ timestamp: 'd3', value: 7, lower: 6, upper: 8 }],
    })
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual({ day: 'd1', count: 3 })
    expect(out[2]).toEqual({ day: 'd3', countF: 7, countFRange: [6, 8] })
  })

  it('returns rows as-is without forecast', () => {
    const rows = [{ day: 'd1', count: 3 }]
    expect(withForecastRange(rows, 'day', 'countF', null)).toEqual(rows)
  })

  it('formats future timestamps for the axis', () => {
    const out = withForecastRange([{ day: '19.09', count: 3 }], 'day', 'countF', {
      label: 't',
      color: 'c',
      fromTime: 0,
      r2: 0.9,
      points: [{ timestamp: '2026-09-20T00:00:00.000Z', value: 4, lower: 3, upper: 5 }],
    }, (iso) => iso.slice(0, 10))
    expect(out[1]).toEqual({ day: '2026-09-20', countF: 4, countFRange: [3, 5] })
  })
})

describe('deltaForSeries', () => {
  it('returns a ready line item', () => {
    const values = [100, 102, 104, 106, 108, 110]
    const times = values.map((_, i) => i * 86400000)
    const item = deltaForSeries(values, times, '#60a5fa', { min: 0 })
    expect(item).not.toBeNull()
    expect(item!.color).toBe('#60a5fa')
    expect(item!.current).toBe(110)
    expect(item!.direction).toBe('up')
    expect(item!.percent).toBeGreaterThan(0)
  })

  it('returns null without data', () => {
    expect(deltaForSeries([], [], '#fff', {})).toBeNull()
    expect(deltaForSeries([5], [1], '#fff', {})).toBeNull()
  })
})
