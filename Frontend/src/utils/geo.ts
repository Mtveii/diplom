/** Гео-хелперы: бэкенд иногда присылает пустые координаты/страны — чистим до отрисовки. */

export interface CountryCount {
  country: string
  users: number
}

export interface GeoPointInput {
  lat: number | null | undefined
  lng: number | null | undefined
  city: string | null | undefined
  country: string | null | undefined
  nickname?: string | null | undefined
}

export interface GeoPoint {
  lat: number
  lng: number
  city: string | null
  country: string | null
  nickname: string | null
  /** Фейковый юзер для визуализации (не из БД) — рисуется другим цветом. */
  isFake?: boolean
  /** Население города, млн жителей. Только у фейков — задаёт высоту маркера. */
  population?: number
}

/** Фейковый юзер для визуализации: всегда с реальными координатами густонаселённого места. */
export interface FakeWorldUser {
  nickname: string
  lat: number
  lng: number
  city: string
  country: string
  /** Население агломерации, млн жителей (порядок 2024–2025) — задаёт высоту маркера. */
  population: number
}

/**
 * 40 фейковых юзеров по густонаселённым точкам мира.
 * Нужны, пока в онлайне мало реальных юзеров: дают дуги и пакеты для живости.
 * Помечены префиксом Demo в нике и рисуются янтарным цветом (см. UsersGlobe).
 * Каждый в своей клетке кластеризации (см. GEO_CLUSTER_CELL) — маркеры не слипаются.
 */
export const FAKE_WORLD_USERS: FakeWorldUser[] = [
  { nickname: 'Demo Tokyo', lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan', population: 37.1 },
  { nickname: 'Demo Delhi', lat: 28.61, lng: 77.21, city: 'Delhi', country: 'India', population: 33.8 },
  { nickname: 'Demo Shanghai', lat: 31.23, lng: 121.47, city: 'Shanghai', country: 'China', population: 29.9 },
  { nickname: 'Demo SaoPaulo', lat: -23.55, lng: -46.63, city: 'São Paulo', country: 'Brazil', population: 22.6 },
  { nickname: 'Demo MexicoCity', lat: 19.43, lng: -99.13, city: 'Mexico City', country: 'Mexico', population: 22.3 },
  { nickname: 'Demo Cairo', lat: 30.04, lng: 31.24, city: 'Cairo', country: 'Egypt', population: 22.1 },
  { nickname: 'Demo Beijing', lat: 39.9, lng: 116.4, city: 'Beijing', country: 'China', population: 22.0 },
  { nickname: 'Demo Mumbai', lat: 19.08, lng: 72.88, city: 'Mumbai', country: 'India', population: 21.3 },
  { nickname: 'Demo NYC', lat: 40.71, lng: -74.0, city: 'New York', country: 'USA', population: 18.8 },
  { nickname: 'Demo Istanbul', lat: 41.01, lng: 28.98, city: 'Istanbul', country: 'Turkey', population: 16.0 },
  { nickname: 'Demo BuenosAires', lat: -34.6, lng: -58.38, city: 'Buenos Aires', country: 'Argentina', population: 15.4 },
  { nickname: 'Demo Lagos', lat: 6.52, lng: 3.38, city: 'Lagos', country: 'Nigeria', population: 15.3 },
  { nickname: 'Demo London', lat: 51.51, lng: -0.13, city: 'London', country: 'UK', population: 14.3 },
  { nickname: 'Demo Madrid', lat: 40.42, lng: -3.7, city: 'Madrid', country: 'Spain', population: 6.6 },
  { nickname: 'Demo LA', lat: 34.05, lng: -118.24, city: 'Los Angeles', country: 'USA', population: 12.4 },
  { nickname: 'Demo Paris', lat: 48.86, lng: 2.35, city: 'Paris', country: 'France', population: 11.4 },
  { nickname: 'Demo Seoul', lat: 37.57, lng: 126.98, city: 'Seoul', country: 'South Korea', population: 10.2 },
  { nickname: 'Demo Joburg', lat: -26.2, lng: 28.05, city: 'Johannesburg', country: 'South Africa', population: 6.2 },
  { nickname: 'Demo Berlin', lat: 52.52, lng: 13.4, city: 'Berlin', country: 'Germany', population: 6.0 },
  { nickname: 'Demo Sydney', lat: -33.87, lng: 151.21, city: 'Sydney', country: 'Australia', population: 5.1 },
  { nickname: 'Demo Jakarta', lat: -6.2, lng: 106.8, city: 'Jakarta', country: 'Indonesia', population: 33.0 },
  { nickname: 'Demo Dhaka', lat: 23.8, lng: 90.4, city: 'Dhaka', country: 'Bangladesh', population: 23.0 },
  { nickname: 'Demo Osaka', lat: 34.7, lng: 135.5, city: 'Osaka', country: 'Japan', population: 19.0 },
  { nickname: 'Demo Karachi', lat: 24.9, lng: 67.0, city: 'Karachi', country: 'Pakistan', population: 17.0 },
  { nickname: 'Demo Kinshasa', lat: -4.3, lng: 15.3, city: 'Kinshasa', country: 'DR Congo', population: 15.0 },
  { nickname: 'Demo Manila', lat: 14.6, lng: 121.0, city: 'Manila', country: 'Philippines', population: 14.0 },
  { nickname: 'Demo Guangzhou', lat: 23.1, lng: 113.3, city: 'Guangzhou', country: 'China', population: 14.0 },
  { nickname: 'Demo Lima', lat: -12.05, lng: -77.04, city: 'Lima', country: 'Peru', population: 11.0 },
  { nickname: 'Demo Bogota', lat: 4.7, lng: -74.05, city: 'Bogotá', country: 'Colombia', population: 11.0 },
  { nickname: 'Demo Bangkok', lat: 13.75, lng: 100.5, city: 'Bangkok', country: 'Thailand', population: 10.0 },
  { nickname: 'Demo Taipei', lat: 25.03, lng: 121.57, city: 'Taipei', country: 'Taiwan', population: 9.0 },
  { nickname: 'Demo Tehran', lat: 35.7, lng: 51.4, city: 'Tehran', country: 'Iran', population: 9.0 },
  { nickname: 'Demo Chicago', lat: 41.88, lng: -87.63, city: 'Chicago', country: 'USA', population: 9.0 },
  { nickname: 'Demo HoChiMinh', lat: 10.82, lng: 106.63, city: 'Ho Chi Minh City', country: 'Vietnam', population: 9.0 },
  { nickname: 'Demo Houston', lat: 29.76, lng: -95.37, city: 'Houston', country: 'USA', population: 7.0 },
  { nickname: 'Demo Toronto', lat: 43.65, lng: -79.38, city: 'Toronto', country: 'Canada', population: 6.0 },
  { nickname: 'Demo Santiago', lat: -33.45, lng: -70.66, city: 'Santiago', country: 'Chile', population: 6.0 },
  { nickname: 'Demo Milan', lat: 45.46, lng: 9.19, city: 'Milan', country: 'Italy', population: 5.3 },
  { nickname: 'Demo Nairobi', lat: -1.29, lng: 36.82, city: 'Nairobi', country: 'Kenya', population: 5.0 },
  { nickname: 'Demo Rome', lat: 41.9, lng: 12.5, city: 'Rome', country: 'Italy', population: 4.3 },
]

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Бекенд маркирует отсутствие гео строкой "Unknown" (а не null) —
 * такое значение местом не считаем, регистр не важен.
 */
function isUnknownPlace(value: string | null | undefined): boolean {
  if (value == null) {
    return true
  }
  const trimmed = value.trim()
  return trimmed.length === 0 || trimmed.toLowerCase() === 'unknown'
}

/** Чистое название места либо null, если бек прислал пустоту/"Unknown". */
export function cleanPlace(value: string | null | undefined): string | null {
  if (isUnknownPlace(value)) {
    return null
  }
  return (value as string).trim()
}

/**
 * Реальные координаты: конечные числа, кроме точки (0, 0) —
 * ею бек маркирует отсутствие координат (Null Island в океане нам не нужен).
 */
function hasRealCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return isFiniteNumber(lat) && isFiniteNumber(lng) && !(lat === 0 && lng === 0)
}

/** Есть ли у юзера хоть какие-то реальные гео-данные (место или координаты). */
export function hasGeoData(user: GeoPointInput): boolean {
  return cleanPlace(user.city) !== null || cleanPlace(user.country) !== null || hasRealCoords(user.lat, user.lng)
}

/** Группировка онлайн-пользователей по странам (пустые/"Unknown" пропускаем), сортировка по убыванию. */
export function groupUsersByCountry(users: readonly GeoPointInput[]): CountryCount[] {
  const byCountry = new Map<string, number>()
  for (const user of users) {
    const country = cleanPlace(user.country)
    if (!country) {
      continue
    }
    byCountry.set(country, (byCountry.get(country) ?? 0) + 1)
  }
  return [...byCountry.entries()]
    .map(([country, count]) => ({ country, users: count }))
    .sort((a, b) => b.users - a.users)
}

export interface GeoRosterInput {
  nickname?: string | null
  city: string | null | undefined
  country: string | null | undefined
  lat?: number | null | undefined
  lng?: number | null | undefined
}

export interface GeoRosterEntry {
  name: string
  place: string
}

/**
 * Подпись юзера для гео-ростера: «Ник — Город, Страна».
 * Пустые части и маркер бека "Unknown" отбрасываем; если места нет,
 * но есть реальные координаты — показываем их; иначе подпись unknownLabel.
 */
export function describeGeoUser(user: GeoRosterInput, unknownLabel: string, fallbackName: string): GeoRosterEntry {
  const name = user.nickname?.trim() || fallbackName
  const parts = [cleanPlace(user.city), cleanPlace(user.country)].filter((part): part is string => part !== null)
  if (parts.length > 0) {
    return { name, place: parts.join(', ') }
  }
  if (hasRealCoords(user.lat, user.lng)) {
    return { name, place: `${user.lat}, ${user.lng}` }
  }
  return { name, place: unknownLabel }
}

/** Одесса — точка по умолчанию для юзеров без гео, чтобы они были видны на глобусе, а не терялись. */
export const ODESSA_COORDS = { lat: 46.4825, lng: 30.7233 } as const

/**
 * Точки для глобуса: с реальными координатами как есть (без маркера 0,0),
 * без координат — в точку fallback с детерминированным разбросом ±0.6°,
 * чтобы несколько таких юзеров не слипались в одну точку.
 * Без fallback — старое поведение: без координат точка отбрасывается.
 * Место всегда чистим от "Unknown".
 */
export function toGlobePoints(
  users: readonly GeoPointInput[],
  fallback: { lat: number; lng: number } | null = null,
): GeoPoint[] {
  const cleanNickname = (nickname: string | null | undefined): string | null => {
    if (typeof nickname !== 'string') {
      return null
    }
    const trimmed = nickname.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return users
    .map((user, index) => {
      const nickname = cleanNickname(user.nickname)
      if (hasRealCoords(user.lat, user.lng)) {
        return {
          lat: user.lat as number,
          lng: user.lng as number,
          city: cleanPlace(user.city),
          country: cleanPlace(user.country),
          nickname,
        }
      }
      if (!fallback) {
        return null
      }
      const dx = (((index * 37) % 11) - 5) * 0.12
      const dy = (((index * 53) % 11) - 5) * 0.12
      return {
        lat: fallback.lat + dy,
        lng: fallback.lng + dx,
        city: cleanPlace(user.city),
        country: cleanPlace(user.country),
        nickname,
      }
    })
    .filter((point): point is GeoPoint => point !== null)
}

export interface GeoCluster {
  /** Центроид кластера. */
  lat: number
  lng: number
  city: string | null
  country: string | null
  /** Всего юзеров в кластере. */
  count: number
  /** Суммарное население фейковых городов кластера, млн (реальные дают 0). */
  population: number
  /** Есть ли реальные юзеры — задаёт цвет маркера. */
  hasReal: boolean
}

/**
 * Шаг сетки кластеризации, градусы. Юзеры без координат встают скоплением
 * на Одессу (±0.6°) — сливаются в один кластер; фейки разнесены на >3° —
 * каждый остаётся отдельным маркером.
 */
export const GEO_CLUSTER_CELL = 2

/** Высота маркера кластера в радиусах планеты: база + за юзеров + за население. */
export const CLUSTER_BASE_ALT = 0.0015
export const CLUSTER_PER_USER_ALT = 0.0008
export const CLUSTER_PER_MILLION_ALT = 0.0004
export const CLUSTER_MAX_ALT = 0.035

/**
 * Высота маркера кластера: 10 юзеров в одном месте — выше, чем 5;
 * фейковый город — выше по своему населению (Токио выше Сиднея).
 */
export function clusterAltitude(count: number, population: number): number {
  return Math.min(CLUSTER_MAX_ALT, CLUSTER_BASE_ALT + count * CLUSTER_PER_USER_ALT + population * CLUSTER_PER_MILLION_ALT)
}

/** Радиус маркера кластера в угловых градусах: база + за юзеров + за население. */
export const CLUSTER_BASE_RADIUS = 0.225
export const CLUSTER_PER_USER_RADIUS = 0.03
export const CLUSTER_PER_MILLION_RADIUS = 0.004
export const CLUSTER_MAX_RADIUS = 0.6

/**
 * Ширина маркера кластера: растёт вширь вместе с высотой —
 * больше юзеров или населения — шире столб.
 */
export function clusterRadius(count: number, population: number): number {
  return Math.min(
    CLUSTER_MAX_RADIUS,
    CLUSTER_BASE_RADIUS + (count - 1) * CLUSTER_PER_USER_RADIUS + population * CLUSTER_PER_MILLION_RADIUS,
  )
}

/**
 * Кластеризация юзеров по сетке: близкие сливаются в один маркер
 * (высота — по числу юзеров), далёкие остаются по одному.
 * Место кластера — от первого участника; население — сумма фейковых.
 */
export function clusterGeoPoints(users: readonly GeoPoint[], cell: number = GEO_CLUSTER_CELL): GeoCluster[] {
  const cells = new Map<string, GeoPoint[]>()
  for (const user of users) {
    const key = `${Math.floor(user.lat / cell)}:${Math.floor(user.lng / cell)}`
    const bucket = cells.get(key)
    if (bucket) {
      bucket.push(user)
    } else {
      cells.set(key, [user])
    }
  }
  const clusters: GeoCluster[] = []
  for (const members of cells.values()) {
    const first = members[0]
    if (!first) {
      continue
    }
    let lat = 0
    let lng = 0
    let population = 0
    let hasReal = false
    for (const member of members) {
      lat += member.lat
      lng += member.lng
      population += member.population ?? 0
      if (!member.isFake) {
        hasReal = true
      }
    }
    clusters.push({
      lat: lat / members.length,
      lng: lng / members.length,
      city: first.city,
      country: first.country,
      count: members.length,
      population,
      hasReal,
    })
  }
  return clusters
}

/** Высота камеры (в радиусах планеты), ниже которой включаются спутниковые тайлы. */
export const TILE_ZOOM_IN_ALTITUDE = 0.55
/** Высота камеры, выше которой возвращаемся на шейдер день/ночь. Между порогами режим не меняем (гистерезис). */
export const TILE_ZOOM_OUT_ALTITUDE = 0.9

/**
 * Какой режим глобуса показывать: спутниковые тайлы вблизи,
 * шейдер день/ночь издалека. Гистерезис — чтобы не мигало на границе.
 */
export function resolveGlobeMode(altitude: number, tilesOn: boolean): boolean {
  if (!(altitude >= 0)) {
    return tilesOn
  }
  if (altitude < TILE_ZOOM_IN_ALTITUDE) {
    return true
  }
  if (altitude > TILE_ZOOM_OUT_ALTITUDE) {
    return false
  }
  return tilesOn
}

export interface SunVector {
  x: number
  y: number
  z: number
}

/**
 * Мировое направление на Солнце в системе координат сцены three-globe
 * (та же, что polar2Cartesian: x = sinφ·cosθ, y = cosφ, z = sinφ·sinθ).
 * Для DirectionalLight: только направление, длина не важна.
 */
export function getSunVector(date: Date = new Date()): SunVector {
  const { lat, lng } = getSubsolarPoint(date)
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((90 - lng) * Math.PI) / 180
  const x = Math.sin(phi) * Math.cos(theta)
  const y = Math.cos(phi)
  const z = Math.sin(phi) * Math.sin(theta)
  const length = Math.hypot(x, y, z) || 1
  return { x: x / length, y: y / length, z: z / length }
}

export interface SubsolarPoint {
  /** Широта подсолнечной точки (склонение солнца), градусы. */
  lat: number
  /** Долгота подсолнечной точки, градусы [-180, 180]. */
  lng: number
}

export interface ChatArc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  /** Подпись дуги «кто → кому» для ховера; координаты — если ника нет. */
  label: string
  /** Высота параболы в единицах радиуса планеты (пропорциональна длине дуги). */
  altitude: number
}

/**
 * Множитель высоты дуги от great-arc расстояния — квадратичный.
 * Близкие передачи стелятся почти горизонтально у поверхности,
 * дальние уходят параболой повыше, но всё равно низко:
 * даже самая дальняя дуга в ~2 раза ниже дефолта three-globe (0.5).
 */
export const ARC_HEIGHT_SCALE = 0.09

/** Центральный угол между двумя точками в радианах (haversine). */
export function centralAngle(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180
  const dLat = toRad(toLat - fromLat)
  const dLng = toRad(toLng - fromLng)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, h))))
}

/**
 * Минимальная высота дуги: даже короткие перелёты рисуются видимой аркой,
 * а не плоской линией у поверхности.
 */
export const MIN_ARC_ALTITUDE = 0.05

/** Пауза между волнами пакетов: случайная от 1 до 2.5 секунд. */
export const WAVE_DELAY_MIN_MS = 1000
export const WAVE_DELAY_MAX_MS = 2500

/** Случайная задержка волны в [1000, 2500) мс; random инжектится ради тестов. */
export function randomWaveDelayMs(random: () => number = Math.random): number {
  return WAVE_DELAY_MIN_MS + random() * (WAVE_DELAY_MAX_MS - WAVE_DELAY_MIN_MS)
}

/**
 * Высота параболы для пары точек: растёт с квадратом расстояния
 * (близко — плоско, далеко — высоко), но не ниже минимума.
 */
export function arcAltitudeForEndpoints(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const halfAngle = centralAngle(fromLat, fromLng, toLat, toLng) / 2
  return MIN_ARC_ALTITUDE + halfAngle * halfAngle * ARC_HEIGHT_SCALE
}

/** Короткая подпись конца дуги: ник либо округлённые координаты. */
function arcEndpointLabel(point: GeoPoint): string {
  const nickname = typeof point.nickname === 'string' ? point.nickname.trim() : ''
  if (nickname.length > 0) {
    return nickname
  }
  const round2 = (value: number): number => Math.round(value * 100) / 100
  return `${round2(point.lat)}, ${round2(point.lng)}`
}

/**
 * Дуги связи «чат» между онлайн-юзерами: каждый соединён со следующим по кольцу.
 * Порядок базовый детерминированный (по координатам), seedShift поворачивает
 * пары — раз в пару минут пары меняются, имитируя живое общение.
 * Неупорядоченные дубли (A→B и B→A) схлопываются: на пару ровно одна линия.
 * Высота каждой дуги пропорциональна её длине. Меньше 2 юзеров — дуг нет.
 */
export function buildCommunicationArcs(users: readonly GeoPoint[], seedShift = 0, maxArcs = 10): ChatArc[] {
  const count = users.length
  if (count < 2) {
    return []
  }
  const order = [...users].sort((a, b) => a.lat - b.lat || a.lng - b.lng)
  const total = Math.min(count, Math.max(1, maxArcs))
  const arcs: ChatArc[] = []
  const seenPairs = new Set<string>()
  for (let i = 0; i < total; i++) {
    const from = order[(i + seedShift) % count]
    const to = order[(i + 1 + seedShift) % count]
    if (from === undefined || to === undefined) {
      continue
    }
    const keyA = `${from.lat},${from.lng}`
    const keyB = `${to.lat},${to.lng}`
    const pairKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`
    if (seenPairs.has(pairKey)) {
      continue
    }
    seenPairs.add(pairKey)
    arcs.push(makeChatArc(from, to))
  }
  return arcs
}

/** Одна дуга между двумя юзерами: подпись + высота от дистанции. */
function makeChatArc(from: GeoPoint, to: GeoPoint): ChatArc {
  return {
    startLat: from.lat,
    startLng: from.lng,
    endLat: to.lat,
    endLng: to.lng,
    label: `${arcEndpointLabel(from)} → ${arcEndpointLabel(to)}`,
    altitude: arcAltitudeForEndpoints(from.lat, from.lng, to.lat, to.lng),
  }
}

/** Базовая вероятность отправки пакета одним юзером за волну. */
export const PACKET_SEND_BASE_PROBABILITY = 0.08
/** Сколько отправок хотим видеть за волну в среднем — вероятность масштабируется. */
export const PACKET_SENDS_PER_WAVE = 2

/**
 * Вероятность отправки пакета одним юзером: держит в среднем
 * PACKET_SENDS_PER_WAVE отправки на волну при любом онлайне,
 * но не выше базовой — суммарный поток пакетов не взрывается.
 */
export function packetSendProbability(userCount: number): number {
  if (userCount < 2) {
    return 0
  }
  return Math.min(PACKET_SEND_BASE_PROBABILITY, PACKET_SENDS_PER_WAVE / userCount)
}

/**
 * Минимальная длина визуализируемого перелёта, радианы (~5° ≈ 550 км).
 * Короче — на масштабе планеты не видно (доли пикселя): такие пары
 * пропускаем. Это заодно отсекает микроперелёты внутри скопления
 * юзеров без координат (все встают на Одессу ±0.6°) — иначе почти
 * каждая волна рисовала бы невидимые линии Одесса → Одесса.
 */
export const MIN_PACKET_ROUTE_ANGLE = (5 * Math.PI) / 180

/**
 * Насколько население увеличивает шанс отправки: вес = 1 + population × FACTOR.
 * Точки крупных городов отправляют пакеты чаще мелких (Токио ~в 5 раз чаще
 * обычного юзера без населения).
 */
export const PACKET_POPULATION_FACTOR = 0.1

/** Вес отправки юзера: 1 для обычных, выше для населённых фейковых городов. */
export function packetSendWeight(user: Pick<GeoPoint, 'population'>): number {
  return 1 + (user.population ?? 0) * PACKET_POPULATION_FACTOR
}

/**
 * Маршруты пакетов волны: каждый юзер независимо решает отправлять ли,
 * шанс — probability × вес от населения; цель — случайный другой юзер
 * (себя исключаем сдвигом индекса).
 * Пары короче MIN_PACKET_ROUTE_ANGLE пропускаем — их не видно.
 * random инжектится ради тестов; в проде — Math.random.
 */
export function buildPacketRouteArcs(
  users: readonly GeoPoint[],
  probability: number,
  random: () => number,
  maxRoutes: number,
): ChatArc[] {
  const count = users.length
  if (count < 2 || maxRoutes <= 0 || probability <= 0) {
    return []
  }
  const arcs: ChatArc[] = []
  for (let i = 0; i < count && arcs.length < maxRoutes; i++) {
    const from = users[i]
    if (from === undefined) {
      continue
    }
    if (random() >= probability * packetSendWeight(from)) {
      continue
    }
    const target = Math.floor(random() * (count - 1))
    const toIndex = target >= i ? target + 1 : target
    const to = users[toIndex]
    if (to === undefined) {
      continue
    }
    if (centralAngle(from.lat, from.lng, to.lat, to.lng) < MIN_PACKET_ROUTE_ANGLE) {
      continue
    }
    arcs.push(makeChatArc(from, to))
  }
  return arcs
}

/** Длительность перелёта одного пакета по дуге, мс. */
export const PACKET_FLIGHT_MS = 1500

/**
 * Easing полёта пакета: быстрый старт, притормаживание у апекса,
 * ускорение на пикировании. Производная 1+0.6·cos(2πt) > 0 — монотонно.
 */
export function easePacketFlight(t: number): number {
  if (t <= 0) {
    return 0
  }
  if (t >= 1) {
    return 1
  }
  return t + (0.6 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI)
}

/** Детерминированный ГПСЧ: один seed — один порядок пар (тестируемо, без Math.random в логике). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let result = Math.imul(state ^ (state >>> 15), 1 | state)
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Случайное подмножество дуг для волны пакетов (тасование Фишера–Йетса на seed).
 * Пустой вход или maxFlights <= 0 — пустой выход.
 */
export function pickWaveArcs(arcs: readonly ChatArc[], seed: number, maxFlights: number): ChatArc[] {
  if (arcs.length === 0 || maxFlights <= 0) {
    return []
  }
  const shuffled = [...arcs]
  const random = mulberry32(seed)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const current = shuffled[i]
    const other = shuffled[j]
    if (current !== undefined && other !== undefined) {
      shuffled[i] = other
      shuffled[j] = current
    }
  }
  return shuffled.slice(0, Math.min(maxFlights, shuffled.length))
}

export interface PacketPosition {
  lat: number
  lng: number
  alt: number
}

interface GlobeVec {
  x: number
  y: number
  z: number
}

/** Радиус планеты в юнитах three-globe: r = 100 * (1 + alt). */
const GLOBE_RADIUS_UNITS = 100

/** Та же конвенция, что polar2Cartesian в three-globe. */
function toGlobeVec(lat: number, lng: number, alt: number): GlobeVec {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((90 - lng) * Math.PI) / 180
  const r = GLOBE_RADIUS_UNITS * (1 + alt)
  const phiSin = Math.sin(phi)
  return { x: r * phiSin * Math.cos(theta), y: r * Math.cos(phi), z: r * phiSin * Math.sin(theta) }
}

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

/** Сферическая интерполяция двух точек (аналог d3.geoInterpolate из three-globe). */
function slerpPoint(fromLat: number, fromLng: number, toLat: number, toLng: number, t: number): { lat: number; lng: number } {
  const a = toGlobeVec(fromLat, fromLng, 0)
  const b = toGlobeVec(toLat, toLng, 0)
  const radiusSquared = GLOBE_RADIUS_UNITS * GLOBE_RADIUS_UNITS
  const dot = Math.min(1, Math.max(-1, (a.x * b.x + a.y * b.y + a.z * b.z) / radiusSquared))
  const angle = Math.acos(dot)
  if (angle < 1e-6 || Math.PI - angle < 1e-6) {
    // Совпадающие или антиподальные точки — обычная интерполяция.
    return { lat: fromLat + (toLat - fromLat) * t, lng: wrapLng(fromLng + (toLng - fromLng) * t) }
  }
  const sinAngle = Math.sin(angle)
  const ka = Math.sin((1 - t) * angle) / sinAngle
  const kb = Math.sin(t * angle) / sinAngle
  const x = ka * a.x + kb * b.x
  const y = ka * a.y + kb * b.y
  const z = ka * a.z + kb * b.z
  const r = Math.hypot(x, y, z)
  const lat = 90 - (Math.acos(Math.min(1, Math.max(-1, y / r))) * 180) / Math.PI
  return { lat, lng: wrapLng(90 - (Math.atan2(z, x) * 180) / Math.PI) }
}

/**
 * Позиция пакета на маршруте: точка great-circle (slerp) между концами,
 * приподнятая над поверхностью на altitude × sin(πt).
 * Вершина ровно посередине и ровно altitude, концы ровно на земле —
 * кривая по построению не уходит под поверхность ни при какой дальности
 * (кубический Безье three-globe на дальних дугах проседал до −25% радиуса).
 * easedT уже после easePacketFlight.
 */
export function packetPosition(arc: Pick<ChatArc, 'startLat' | 'startLng' | 'endLat' | 'endLng' | 'altitude'>, easedT: number): PacketPosition {
  const t = Math.min(1, Math.max(0, easedT))
  const surface = slerpPoint(arc.startLat, arc.startLng, arc.endLat, arc.endLng, t)
  return { lat: surface.lat, lng: surface.lng, alt: arc.altitude * Math.sin(Math.PI * t) }
}

/**
 * Подсолнечная точка на момент времени: куда солнце светит вертикально.
 * Нужно шейдеру день/ночь, чтобы тёмная сторона совпадала с реальной ночью
 * (в 2 часа ночи в Америке Америка тёмная). Точность ~±0.3° — для терминатора хватает.
 */
export function getSubsolarPoint(date: Date = new Date()): SubsolarPoint {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86400000)
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const declination = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365)
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364
  const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  const rawLng = 180 - utcHours * 15 - equationOfTime / 4
  const lng = ((((rawLng + 180) % 360) + 360) % 360) - 180
  return { lat: declination, lng }
}
