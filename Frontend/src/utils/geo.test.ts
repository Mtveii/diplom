import { describe, expect, it } from 'vitest'
import { cleanPlace, describeGeoUser, getSubsolarPoint, getSunVector, groupUsersByCountry, hasGeoData, resolveGlobeMode, toGlobePoints } from './geo'

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

  it('skips backend "Unknown" marker as missing', () => {
    const result = groupUsersByCountry([
      { country: 'Unknown', lat: 1, lng: 1, city: 'a' },
      { country: 'unknown', lat: 1, lng: 1, city: 'b' },
      { country: '  UNKNOWN  ', lat: 1, lng: 1, city: 'c' },
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

  it('drops backend markers: (0, 0) coords and "Unknown" names', () => {
    const result = toGlobePoints([
      { lat: 0, lng: 0, city: 'Unknown', country: 'Unknown' },
      { lat: 50, lng: 30, city: 'Unknown', country: 'UA' },
    ])
    expect(result).toEqual([{ lat: 50, lng: 30, city: null, country: 'UA' }])
  })
})

describe('describeGeoUser', () => {
  it('joins nickname with city and country', () => {
    expect(describeGeoUser({ nickname: 'Neo', city: 'Kyiv', country: 'UA' }, 'Unknown', 'No name')).toEqual({
      name: 'Neo',
      place: 'Kyiv, UA',
    })
  })

  it('drops empty parts and falls back to labels', () => {
    expect(describeGeoUser({ nickname: '  ', city: 'Berlin', country: null }, 'Unknown', 'No name')).toEqual({
      name: 'No name',
      place: 'Berlin',
    })
    expect(describeGeoUser({ city: null, country: undefined }, 'Unknown', 'No name')).toEqual({
      name: 'No name',
      place: 'Unknown',
    })
  })

  it('falls back to coordinates when city and country are missing', () => {
    expect(describeGeoUser({ nickname: 'Neo', city: null, country: null, lat: 50.45, lng: 30.52 }, 'Unknown', 'No name')).toEqual({
      name: 'Neo',
      place: '50.45, 30.52',
    })
    expect(describeGeoUser({ city: '', country: '  ', lat: NaN, lng: 30 }, 'Unknown', 'No name')).toEqual({
      name: 'No name',
      place: 'Unknown',
    })
  })

  it('treats backend "Unknown" strings and (0, 0) as missing', () => {
    expect(describeGeoUser({ nickname: 'Guest', city: 'Unknown', country: 'Unknown', lat: 0, lng: 0 }, 'Невідомо', 'Без імені')).toEqual({
      name: 'Guest',
      place: 'Невідомо',
    })
    expect(describeGeoUser({ nickname: 'Neo', city: 'UNKNOWN', country: null, lat: 50.45, lng: 30.52 }, 'Unknown', 'No name')).toEqual({
      name: 'Neo',
      place: '50.45, 30.52',
    })
  })
})

describe('cleanPlace', () => {
  it('trims real names and nulls backend markers', () => {
    expect(cleanPlace('  Kyiv  ')).toBe('Kyiv')
    expect(cleanPlace(null)).toBeNull()
    expect(cleanPlace(undefined)).toBeNull()
    expect(cleanPlace('')).toBeNull()
    expect(cleanPlace('Unknown')).toBeNull()
    expect(cleanPlace('  unknown  ')).toBeNull()
  })
})

describe('hasGeoData', () => {
  it('detects real geo data and backend markers', () => {
    expect(hasGeoData({ city: 'Kyiv', country: null, lat: null, lng: null })).toBe(true)
    expect(hasGeoData({ city: null, country: null, lat: 50.45, lng: 30.52 })).toBe(true)
    expect(hasGeoData({ city: 'Unknown', country: 'Unknown', lat: 0, lng: 0 })).toBe(false)
    expect(hasGeoData({ city: null, country: null, lat: null, lng: null })).toBe(false)
  })
})

describe('getSubsolarPoint', () => {
  it('points near Greenwich at summer-solstice noon UTC', () => {
    const point = getSubsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)))
    expect(point.lat).toBeCloseTo(23.44, 0)
    expect(point.lng).toBeCloseTo(0, -0.3)
  })

  it('points near Greenwich at winter-solstice noon UTC', () => {
    const point = getSubsolarPoint(new Date(Date.UTC(2026, 11, 21, 12, 0, 0)))
    expect(point.lat).toBeCloseTo(-23.44, 0)
    expect(point.lng).toBeCloseTo(0, -0.3)
  })

  it('puts the Americas in darkness at 2 AM New York time in summer', () => {
    // 02:00 EDT = 06:00 UTC -> noon over ~90E, New York (-74) is ~164° away = deep night
    const point = getSubsolarPoint(new Date(Date.UTC(2026, 5, 21, 6, 0, 0)))
    expect(point.lng).toBeGreaterThan(80)
    expect(point.lng).toBeLessThan(100)
  })

  it('wraps midnight longitude into [-180, 180]', () => {
    const point = getSubsolarPoint(new Date(Date.UTC(2026, 2, 20, 0, 0, 0)))
    expect(Math.abs(point.lng)).toBeGreaterThan(170)
    expect(Math.abs(point.lng)).toBeLessThanOrEqual(180)
  })
})

describe('resolveGlobeMode', () => {
  it('switches to tiles when zoomed close', () => {
    expect(resolveGlobeMode(0.2, false)).toBe(true)
  })

  it('switches back to day/night shader when zoomed far out', () => {
    expect(resolveGlobeMode(2.5, true)).toBe(false)
  })

  it('keeps current mode inside hysteresis band', () => {
    expect(resolveGlobeMode(0.7, false)).toBe(false)
    expect(resolveGlobeMode(0.7, true)).toBe(true)
  })

  it('keeps current mode for invalid altitude', () => {
    expect(resolveGlobeMode(NaN, false)).toBe(false)
    expect(resolveGlobeMode(-1, true)).toBe(true)
  })
})

describe('getSunVector', () => {
  it('returns a unit vector', () => {
    const sun = getSunVector(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)))
    expect(Math.hypot(sun.x, sun.y, sun.z)).toBeCloseTo(1, 5)
  })

  it('points near Greenwich at summer-solstice noon UTC', () => {
    const sun = getSunVector(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)))
    expect(sun.z).toBeGreaterThan(0.9)
    expect(sun.y).toBeGreaterThan(0.3)
    expect(sun.y).toBeLessThan(0.5)
  })

  it('points away from Greenwich at midnight UTC', () => {
    const sun = getSunVector(new Date(Date.UTC(2026, 2, 20, 0, 0, 0)))
    expect(sun.z).toBeLessThan(-0.9)
  })
})
