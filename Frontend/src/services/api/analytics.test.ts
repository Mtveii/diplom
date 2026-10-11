import { describe, expect, it } from 'vitest'
import { buildComparePeriods } from './analytics.api'

describe('buildComparePeriods', () => {
  it('builds adjacent 30-day windows ending now', () => {
    const now = new Date('2026-10-03T12:00:00.000Z')
    const { fromA, toA, fromB, toB } = buildComparePeriods(now)
    expect(toA).toBe('2026-10-03T12:00:00.000Z')
    expect(fromA).toBe('2026-09-03T12:00:00.000Z')
    // B directly precedes A without gaps or overlap
    expect(toB).toBe(fromA)
    expect(fromB).toBe('2026-08-04T12:00:00.000Z')
  })
})
