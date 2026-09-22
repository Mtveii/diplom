import { describe, expect, it } from 'vitest'
import { groupUsersByCountry, toGlobePoints } from './geo'

describe('groupUsersByCountry', () => {
  it('groups and sorts descending', () => {
    const result = groupUsersByCountry([
      { country: 'UA', lat: 1, lng: 1, city: 'a' },
      { country: 'DE', lat: 1, lng: 1, city: 'b' },
      { country: 'UA', lat: 1, lng: 1, city: 'c' },
    ])
    expect(result).toEqual([
      { country: 'UA', users: 2 },
      { country: 'DE', users: 1 },
    ])
  })

  it('skips empty countries', () => {
    const result = groupUsersByCountry([
      { country: '', lat: 1, lng: 1, city: 'a' },
      { country: null, lat: 1, lng: 1, city: 'b' },
      { country: undefined, lat: 1, lng: 1, city: 'c' },
      { country: '  ', lat: 1, lng: 1, city: 'd' },
      { country: 'PL', lat: 1, lng: 1, city: 'e' },
    ])
    expect(result).toEqual([{ country: 'PL', users: 1 }])
  })

  it('returns empty array for no users', () => {
    expect(groupUsersByCountry([])).toEqual([])
  })
})

describe('toGlobePoints', () => {
  it('keeps only points with finite coordinates', () => {
    const result = toGlobePoints([
      { lat: 50, lng: 30, city: 'Kyiv', country: 'UA' },
      { lat: null, lng: 30, city: 'x', country: 'UA' },
      { lat: 50, lng: undefined, city: 'y', country: 'UA' },
      { lat: NaN, lng: 30, city: 'z', country: 'UA' },
    ])
    expect(result).toEqual([{ lat: 50, lng: 30, city: 'Kyiv', country: 'UA' }])
  })

  it('keeps null names for the UI unknown-label', () => {
    const result = toGlobePoints([{ lat: 1, lng: 2, city: null, country: '' }])
    expect(result).toEqual([{ lat: 1, lng: 2, city: null, country: null }])
  })
})
