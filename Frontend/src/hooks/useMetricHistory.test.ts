import { describe, expect, it } from 'vitest'
import { pushSnapshot } from './useMetricHistory'

describe('pushSnapshot', () => {
  it('appends and sorts by time', () => {
    const out = pushSnapshot([{ t: 3, sessions: 1, stability: null }], { t: 1, sessions: 0, stability: null })
    expect(out.map((p) => p.t)).toEqual([1, 3])
  })

  it('caps the tail', () => {
    const history = Array.from({ length: 5 }, (_, i) => ({ t: i, sessions: i, stability: null }))
    const out = pushSnapshot(history, { t: 99, sessions: 9, stability: null }, 5)
    expect(out).toHaveLength(5)
    expect(out[4].t).toBe(99)
    expect(out[0].t).toBe(1)
  })
})
