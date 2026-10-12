import { describe, expect, it } from 'vitest'
import { arcAltitudeForEndpoints, buildCommunicationArcs, buildPacketRouteArcs, centralAngle, cleanPlace, clusterAltitude, clusterGeoPoints, clusterRadius, CLUSTER_BASE_RADIUS, CLUSTER_MAX_ALT, CLUSTER_MAX_RADIUS, describeGeoUser, easePacketFlight, FAKE_WORLD_USERS, getSubsolarPoint, getSunVector, groupUsersByCountry, hasGeoData, MIN_ARC_ALTITUDE, MIN_PACKET_ROUTE_ANGLE, packetPosition, packetSendProbability, packetSendWeight, PACKET_SEND_BASE_PROBABILITY, PACKET_FLIGHT_MS, pickWaveArcs, randomWaveDelayMs, resolveGlobeMode, toGlobePoints, WAVE_DELAY_MAX_MS, WAVE_DELAY_MIN_MS } from './geo'

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
    expect(result).toEqual([{ lat: 50, lng: 30, city: 'Kyiv', country: 'UA', nickname: null }])
  })

  it('keeps null names for the UI unknown-label', () => {
    const result = toGlobePoints([{ lat: 1, lng: 2, city: null, country: '' }])
    expect(result).toEqual([{ lat: 1, lng: 2, city: null, country: null, nickname: null }])
  })

  it('preserves nicknames, blank becomes null', () => {
    const result = toGlobePoints([
      { lat: 1, lng: 2, city: null, country: null, nickname: '  Neo  ' },
      { lat: 3, lng: 4, city: null, country: null, nickname: '   ' },
    ])
    expect(result).toEqual([
      { lat: 1, lng: 2, city: null, country: null, nickname: 'Neo' },
      { lat: 3, lng: 4, city: null, country: null, nickname: null },
    ])
  })

  it('drops backend markers: (0, 0) coords and "Unknown" names', () => {
    const result = toGlobePoints([
      { lat: 0, lng: 0, city: 'Unknown', country: 'Unknown' },
      { lat: 50, lng: 30, city: 'Unknown', country: 'UA' },
    ])
    expect(result).toEqual([{ lat: 50, lng: 30, city: null, country: 'UA', nickname: null }])
  })

  it('places users without coords on fallback with deterministic spread', () => {
    const fallback = { lat: 46.4825, lng: 30.7233 }
    const result = toGlobePoints(
      [
        { lat: 0, lng: 0, city: 'Unknown', country: 'Unknown' },
        { lat: null, lng: null, city: null, country: null },
        { lat: 50, lng: 30, city: 'Kyiv', country: 'UA' },
      ],
      fallback,
    )
    expect(result).toHaveLength(3)
    // real coords untouched
    expect(result[2]).toEqual({ lat: 50, lng: 30, city: 'Kyiv', country: 'UA', nickname: null })
    // fallback points sit near Odessa (±0.6°), spread apart
    expect(result[0].lat).toBeGreaterThanOrEqual(46.4825 - 0.6)
    expect(result[0].lat).toBeLessThanOrEqual(46.4825 + 0.6)
    expect(result[0].lng).toBeGreaterThanOrEqual(30.7233 - 0.6)
    expect(result[0].lng).toBeLessThanOrEqual(30.7233 + 0.6)
    expect(result[0].lat).not.toBe(result[1].lat)
    expect(result[0].lng).not.toBe(result[1].lng)
    // deterministic: same input → same output
    expect(toGlobePoints([{ lat: 0, lng: 0, city: null, country: null }], fallback)).toEqual(
      toGlobePoints([{ lat: 0, lng: 0, city: null, country: null }], fallback),
    )
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

describe('buildCommunicationArcs', () => {
  const kyiv = { lat: 50.45, lng: 30.52, city: 'Kyiv', country: 'UA', nickname: null }
  const berlin = { lat: 52.52, lng: 13.4, city: 'Berlin', country: 'DE', nickname: null }
  const nyc = { lat: 40.71, lng: -74.0, city: 'NYC', country: 'US', nickname: null }

  it('returns no arcs for fewer than 2 users', () => {
    expect(buildCommunicationArcs([])).toEqual([])
    expect(buildCommunicationArcs([kyiv])).toEqual([])
  })

  it('draws exactly one arc per pair (no A→B plus B→A double)', () => {
    const arcs = buildCommunicationArcs([berlin, kyiv])
    expect(arcs).toHaveLength(1)
    expect(arcs[0]).toMatchObject({
      startLat: 50.45,
      startLng: 30.52,
      endLat: 52.52,
      endLng: 13.4,
      label: '50.45, 30.52 → 52.52, 13.4',
    })
  })

  it('labels arcs with nicknames when present', () => {
    const arcs = buildCommunicationArcs([
      { ...kyiv, nickname: 'Neo' },
      { ...berlin, nickname: '  Trinity  ' },
    ])
    expect(arcs).toHaveLength(1)
    expect(arcs[0]?.label).toBe('Neo → Trinity')
  })

  it('scales arc altitude with pair distance', () => {
    const [short] = buildCommunicationArcs([kyiv, berlin])
    const [long] = buildCommunicationArcs([kyiv, nyc])
    expect(short).toBeDefined()
    expect(long).toBeDefined()
    expect(short?.altitude ?? 0).toBeGreaterThan(0)
    expect((long?.altitude ?? 0) > (short?.altitude ?? 0)).toBe(true)
  })

  it('builds a ring over all users', () => {
    const arcs = buildCommunicationArcs([kyiv, berlin, nyc])
    expect(arcs).toHaveLength(3)
    // sorted by lat: nyc(40.71) -> kyiv(50.45) -> berlin(52.52) -> nyc
    expect(arcs[0]).toMatchObject({ startLat: 40.71, endLat: 50.45 })
    expect(arcs[2]).toMatchObject({ startLat: 52.52, endLat: 40.71 })
  })

  it('rotates pairs with seedShift', () => {
    const arcs = buildCommunicationArcs([kyiv, berlin, nyc], 1)
    expect(arcs[0]).toMatchObject({ startLat: 50.45, endLat: 52.52 })
  })

  it('caps arc count with maxArcs', () => {
    expect(buildCommunicationArcs([kyiv, berlin, nyc], 0, 2)).toHaveLength(2)
  })
})

describe('easePacketFlight', () => {
  it('clamps ends and passes through middle', () => {
    expect(easePacketFlight(0)).toBe(0)
    expect(easePacketFlight(1)).toBe(1)
    expect(easePacketFlight(0.5)).toBeCloseTo(0.5, 10)
    expect(easePacketFlight(-2)).toBe(0)
    expect(easePacketFlight(2)).toBe(1)
  })

  it('is fast at takeoff, slow at apex, fast at dive', () => {
    // derivative 1+0.6·cos(2πt): ends 1.6x, apex 0.4x
    expect(easePacketFlight(0.25)).toBeGreaterThan(0.25)
    expect(easePacketFlight(0.75)).toBeLessThan(0.75)
  })

  it('is monotonic', () => {
    let prev = -1
    for (let i = 0; i <= 20; i++) {
      const value = easePacketFlight(i / 20)
      expect(value).toBeGreaterThanOrEqual(prev)
      prev = value
    }
  })
})

describe('pickWaveArcs', () => {
  const arcs = buildCommunicationArcs(
    [
      { lat: 50.45, lng: 30.52, city: 'Kyiv', country: 'UA', nickname: null },
      { lat: 52.52, lng: 13.4, city: 'Berlin', country: 'DE', nickname: null },
      { lat: 40.71, lng: -74.0, city: 'NYC', country: 'US', nickname: null },
    ],
    0,
  )

  it('returns empty for empty input or non-positive cap', () => {
    expect(pickWaveArcs([], 1, 5)).toEqual([])
    expect(pickWaveArcs(arcs, 1, 0)).toEqual([])
  })

  it('is deterministic per seed and caps the count', () => {
    expect(pickWaveArcs(arcs, 42, 2)).toHaveLength(2)
    expect(pickWaveArcs(arcs, 42, 2)).toEqual(pickWaveArcs(arcs, 42, 2))
    expect(pickWaveArcs(arcs, 7, 99)).toHaveLength(3)
  })

  it('returns a permutation of the input', () => {
    const picked = pickWaveArcs(arcs, 123, 99)
    expect(picked).toHaveLength(3)
    expect(new Set(picked.map((arc) => arc.label)).size).toBe(3)
  })
})

describe('centralAngle', () => {
  it('is zero for the same point and π for antipodes', () => {
    expect(centralAngle(10, 20, 10, 20)).toBeCloseTo(0, 10)
    expect(centralAngle(0, 0, 0, 180)).toBeCloseTo(Math.PI, 8)
    expect(centralAngle(0, 0, 0, 90)).toBeCloseTo(Math.PI / 2, 8)
  })
})

describe('arcAltitudeForEndpoints', () => {
  it('is floored for the same point and grows with distance', () => {
    expect(arcAltitudeForEndpoints(10, 20, 10, 20)).toBe(MIN_ARC_ALTITUDE)
    const short = arcAltitudeForEndpoints(50.45, 30.52, 52.52, 13.4)
    const long = arcAltitudeForEndpoints(50.45, 30.52, 40.71, -74.0)
    expect(short).toBeGreaterThan(0)
    expect(long).toBeGreaterThan(short)
  })

  it('shows a visible arch for short hops, higher for far transfers', () => {
    const short = arcAltitudeForEndpoints(50.45, 30.52, 52.52, 13.4)
    const long = arcAltitudeForEndpoints(50.45, 30.52, 40.71, -74.0)
    expect(short).toBeGreaterThanOrEqual(MIN_ARC_ALTITUDE)
    expect(short).toBeLessThan(0.08)
    expect(long).toBeGreaterThan(0.06)
    expect(long).toBeGreaterThan(short)
  })
})

describe('PACKET_FLIGHT_MS', () => {
  it('is 1.5 seconds', () => {
    expect(PACKET_FLIGHT_MS).toBe(1500)
  })
})

describe('packetPosition', () => {
  const arc = {
    startLat: 50,
    startLng: 30,
    endLat: 40,
    endLng: 60,
    altitude: arcAltitudeForEndpoints(50, 30, 40, 60),
  }

  it('sits on endpoints with zero altitude', () => {
    const launched = packetPosition(arc, 0)
    expect(launched.lat).toBeCloseTo(50, 8)
    expect(launched.lng).toBeCloseTo(30, 8)
    expect(launched.alt).toBeCloseTo(0, 10)
    const landed = packetPosition(arc, 1)
    expect(landed.lat).toBeCloseTo(40, 8)
    expect(landed.lng).toBeCloseTo(60, 8)
    expect(landed.alt).toBeCloseTo(0, 10)
  })

  it('peaks mid-flight between endpoints', () => {
    const mid = packetPosition(arc, 0.5)
    expect(mid.lat).toBeGreaterThan(40)
    expect(mid.lat).toBeLessThan(50)
    expect(mid.lng).toBeGreaterThan(30)
    expect(mid.lng).toBeLessThan(60)
    expect(mid.alt).toBeGreaterThan(0.01)
    expect(mid.alt).toBeLessThan(0.5)
  })

  it('follows the curve without NaN on degenerate input', () => {
    const sameArc = { startLat: 10, startLng: 20, endLat: 10, endLng: 20, altitude: 0 }
    const same = packetPosition(sameArc, 0.5)
    expect(Number.isFinite(same.lat)).toBe(true)
    expect(Number.isFinite(same.lng)).toBe(true)
    expect(Number.isFinite(same.alt)).toBe(true)
    const antipodalArc = { startLat: 0, startLng: 0, endLat: 0, endLng: 180, altitude: 0.5 }
    const antipodal = packetPosition(antipodalArc, 0.5)
    expect(Number.isFinite(antipodal.lat)).toBe(true)
    expect(Number.isFinite(antipodal.lng)).toBe(true)
    expect(Number.isFinite(antipodal.alt)).toBe(true)
  })
})

describe('FAKE_WORLD_USERS', () => {
  it('holds 40 marked users with valid world coords', () => {
    expect(FAKE_WORLD_USERS).toHaveLength(40)
    const nicknames = new Set<string>()
    for (const user of FAKE_WORLD_USERS) {
      expect(user.nickname.startsWith('Demo ')).toBe(true)
      expect(user.lat).toBeGreaterThanOrEqual(-60)
      expect(user.lat).toBeLessThanOrEqual(75)
      expect(user.lng).toBeGreaterThanOrEqual(-180)
      expect(user.lng).toBeLessThanOrEqual(180)
      expect(user.city.length).toBeGreaterThan(0)
      expect(user.country.length).toBeGreaterThan(0)
      nicknames.add(user.nickname)
    }
    expect(nicknames.size).toBe(40)
  })
})

describe('randomWaveDelayMs', () => {
  it('returns bounds for edge random values', () => {
    expect(randomWaveDelayMs(() => 0)).toBe(WAVE_DELAY_MIN_MS)
    expect(randomWaveDelayMs(() => 0.999999)).toBeLessThan(WAVE_DELAY_MAX_MS)
    expect(randomWaveDelayMs(() => 0.999999)).toBeGreaterThanOrEqual(WAVE_DELAY_MIN_MS)
  })

  it('stays within [1000, 2500) for real random', () => {
    expect(WAVE_DELAY_MIN_MS).toBe(1000)
    expect(WAVE_DELAY_MAX_MS).toBe(2500)
    for (let i = 0; i < 50; i++) {
      const delay = randomWaveDelayMs()
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThan(2500)
    }
  })
})

describe('packetSendProbability', () => {
  it('returns 0 for fewer than 2 users', () => {
    expect(packetSendProbability(0)).toBe(0)
    expect(packetSendProbability(1)).toBe(0)
  })

  it('is base probability at 20 users', () => {
    expect(PACKET_SEND_BASE_PROBABILITY).toBe(0.08)
    expect(packetSendProbability(20)).toBe(PACKET_SEND_BASE_PROBABILITY)
  })

  it('aims ~2 sends per wave at 40 users', () => {
    expect(packetSendProbability(40)).toBeCloseTo(0.05, 10)
  })

  it('decreases as user count grows', () => {
    expect(packetSendProbability(40)).toBeLessThan(packetSendProbability(20))
    expect(packetSendProbability(100)).toBeLessThan(packetSendProbability(40))
    expect(packetSendProbability(1000)).toBeGreaterThanOrEqual(0)
  })
})

describe('buildPacketRouteArcs', () => {
  const three = [
    { lat: 0, lng: 0, city: 'a', country: 'b', nickname: 'u1' },
    { lat: 10, lng: 10, city: 'c', country: 'd', nickname: 'u2' },
    { lat: -10, lng: -20, city: 'e', country: 'f', nickname: 'u3' },
  ]
  const alwaysSend = () => 0
  const neverSend = () => 0.999999

  it('returns empty for degenerate input', () => {
    expect(buildPacketRouteArcs([], 0.05, alwaysSend, 12)).toEqual([])
    expect(buildPacketRouteArcs([{ lat: 0, lng: 0, city: 'a', country: 'b', nickname: 'u1' }], 0.05, alwaysSend, 12)).toEqual([])
    expect(buildPacketRouteArcs(three, 0, alwaysSend, 12)).toEqual([])
    expect(buildPacketRouteArcs(three, 0.05, alwaysSend, 0)).toEqual([])
  })

  it('every user sends when random is below probability, never to self', () => {
    const arcs = buildPacketRouteArcs(three, 0.05, alwaysSend, 12)
    expect(arcs).toHaveLength(3)
    for (const arc of arcs) {
      expect(`${arc.startLat},${arc.startLng}`).not.toBe(`${arc.endLat},${arc.endLng}`)
      expect(typeof arc.label).toBe('string')
      expect(arc.label.length).toBeGreaterThan(0)
      expect(typeof arc.altitude).toBe('number')
    }
  })

  it('nobody sends when random is above probability', () => {
    expect(buildPacketRouteArcs(three, 0.05, neverSend, 12)).toEqual([])
  })

  it('caps routes at maxRoutes', () => {
    expect(buildPacketRouteArcs(three, 0.05, alwaysSend, 2)).toHaveLength(2)
  })

  it('skips micro-routes shorter than 5 degrees (invisible on the globe)', () => {
    expect(MIN_PACKET_ROUTE_ANGLE).toBeCloseTo((5 * Math.PI) / 180, 10)
    // Скопление как юзеры без координат на Одессе: только соседи — маршрутов нет.
    const odessaCluster = [
      { lat: 46.48, lng: 30.72, city: 'Odesa', country: 'UA', nickname: 'u1' },
      { lat: 46.52, lng: 30.75, city: 'Odesa', country: 'UA', nickname: 'u2' },
      { lat: 46.45, lng: 30.7, city: 'Odesa', country: 'UA', nickname: 'u3' },
    ]
    expect(buildPacketRouteArcs(odessaCluster, 0.05, alwaysSend, 12)).toEqual([])
  })

  it('keeps only far routes when a cluster mixes with distant users', () => {
    const mixed = [
      { lat: 46.48, lng: 30.72, city: 'Odesa', country: 'UA', nickname: 'u1' },
      { lat: 46.52, lng: 30.75, city: 'Odesa', country: 'UA', nickname: 'u2' },
      { lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'JP', nickname: 'u3' },
    ]
    const arcs = buildPacketRouteArcs(mixed, 0.05, alwaysSend, 12)
    expect(arcs).toHaveLength(1)
    expect(arcs[0]?.label).toBe('u3 → u1')
  })
})

describe('clusterGeoPoints', () => {
  it('merges nearby users into one cluster with count', () => {
    const clusters = clusterGeoPoints([
      { lat: 46.48, lng: 30.72, city: 'Odesa', country: 'UA', nickname: 'a' },
      { lat: 46.52, lng: 30.75, city: 'Odesa', country: 'UA', nickname: 'b' },
      { lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'JP', nickname: 'c' },
    ])
    expect(clusters).toHaveLength(2)
    const odessa = clusters.find((cluster) => cluster.city === 'Odesa')
    expect(odessa?.count).toBe(2)
    expect(odessa?.hasReal).toBe(true)
    expect(odessa?.population).toBe(0)
    expect(odessa?.lat).toBeCloseTo(46.5, 5)
  })

  it('keeps every fake world user in its own cluster', () => {
    const asPoints = FAKE_WORLD_USERS.map((fake) => ({
      lat: fake.lat,
      lng: fake.lng,
      city: fake.city,
      country: fake.country,
      nickname: fake.nickname,
      isFake: true,
      population: fake.population,
    }))
    const clusters = clusterGeoPoints(asPoints)
    expect(clusters).toHaveLength(FAKE_WORLD_USERS.length)
    for (const cluster of clusters) {
      expect(cluster.count).toBe(1)
      expect(cluster.hasReal).toBe(false)
      expect(cluster.population).toBeGreaterThan(0)
    }
  })

  it('sums fake population and flags real presence in mixed clusters', () => {
    const clusters = clusterGeoPoints([
      { lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'JP', nickname: 'Demo Tokyo', isFake: true, population: 37.1 },
      { lat: 35.7, lng: 139.7, city: 'Tokyo', country: 'JP', nickname: 'real' },
    ])
    expect(clusters).toHaveLength(1)
    expect(clusters[0]?.count).toBe(2)
    expect(clusters[0]?.hasReal).toBe(true)
    expect(clusters[0]?.population).toBeCloseTo(37.1, 5)
  })
})

describe('clusterAltitude', () => {
  it('is higher for 10 users in one place than for 5', () => {
    expect(clusterAltitude(10, 0)).toBeGreaterThan(clusterAltitude(5, 0))
    expect(clusterAltitude(10, 0)).toBeCloseTo(0.0095, 5)
    expect(clusterAltitude(5, 0)).toBeCloseTo(0.0055, 5)
  })

  it('is higher for populous fake cities (Tokyo above Sydney)', () => {
    expect(clusterAltitude(1, 37.1)).toBeGreaterThan(clusterAltitude(1, 5.1))
  })

  it('caps at max for huge clusters', () => {
    expect(clusterAltitude(100, 0)).toBe(CLUSTER_MAX_ALT)
    expect(clusterAltitude(1, 100)).toBe(CLUSTER_MAX_ALT)
  })
})

describe('clusterRadius', () => {
  it('widens with user count: 10 wider than 5', () => {
    expect(clusterRadius(10, 0)).toBeGreaterThan(clusterRadius(5, 0))
    expect(clusterRadius(1, 0)).toBe(CLUSTER_BASE_RADIUS)
  })

  it('widens with city population (Tokyo wider than Sydney)', () => {
    expect(clusterRadius(1, 37.1)).toBeGreaterThan(clusterRadius(1, 5.1))
  })

  it('caps at max for huge clusters', () => {
    expect(clusterRadius(100, 0)).toBe(CLUSTER_MAX_RADIUS)
    expect(clusterRadius(1, 500)).toBe(CLUSTER_MAX_RADIUS)
  })
})

describe('packetSendWeight', () => {
  it('is 1 for plain users without population', () => {
    expect(packetSendWeight({})).toBe(1)
    expect(packetSendWeight({ population: undefined })).toBe(1)
  })

  it('grows with city population', () => {
    expect(packetSendWeight({ population: 37.1 })).toBeCloseTo(4.71, 10)
    expect(packetSendWeight({ population: 37.1 })).toBeGreaterThan(packetSendWeight({ population: 5.1 }))
  })
})

describe('weighted packet sending', () => {
  it('lets populous cities send while plain users skip on the same roll', () => {
    const pair = [
      { lat: 46.48, lng: 30.72, city: 'Odesa', country: 'UA', nickname: 'plain' },
      { lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'JP', nickname: 'Demo Tokyo', population: 37.1 },
    ]
    // Ролл 0.06: обычный скипает (0.06 >= 0.05), Токио отправляет (0.06 < 0.05 × 4.71).
    const rolls = [0.06, 0.06, 0.0]
    let call = 0
    const stub = () => rolls[call++] ?? 0.999999
    const arcs = buildPacketRouteArcs(pair, 0.05, stub, 12)
    expect(arcs).toHaveLength(1)
    expect(arcs[0]?.label).toBe('Demo Tokyo → plain')
  })
})

describe('packet routes stay above the surface', () => {
  const pairs: Array<[number, number, number, number]> = [
    [50.45, 30.52, 52.52, 13.4],
    [46.48, 30.72, 46.52, 30.75],
    [35.68, 139.69, 40.71, -74.0],
    [-33.87, 151.21, 51.51, -0.13],
    [0, 0, 0, 180],
    [80, 0, -80, 0],
  ]

  it.each(pairs)('never dips below the surface for %j', (fromLat, fromLng, toLat, toLng) => {
    const arc = {
      startLat: fromLat,
      startLng: fromLng,
      endLat: toLat,
      endLng: toLng,
      altitude: arcAltitudeForEndpoints(fromLat, fromLng, toLat, toLng),
    }
    for (let step = 0; step <= 20; step++) {
      expect(packetPosition(arc, step / 20).alt).toBeGreaterThanOrEqual(-1e-9)
    }
  })

  it('is higher for farther points, up to antipodal', () => {
    const short = arcAltitudeForEndpoints(50.45, 30.52, 52.52, 13.4)
    const far = arcAltitudeForEndpoints(35.68, 139.69, 40.71, -74.0)
    const antipodal = arcAltitudeForEndpoints(0, 0, 0, 180)
    expect(far).toBeGreaterThan(short)
    expect(antipodal).toBeGreaterThan(far)
  })
})
