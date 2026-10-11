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
}

export interface GeoPoint {
  lat: number
  lng: number
  city: string | null
  country: string | null
}

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

/** Точки для глобуса: только с реальными координатами (без маркера 0,0), место чистим от "Unknown". */
export function toGlobePoints(users: readonly GeoPointInput[]): GeoPoint[] {
  return users
    .filter((user) => hasRealCoords(user.lat, user.lng))
    .map((user) => ({
      lat: user.lat as number,
      lng: user.lng as number,
      city: cleanPlace(user.city),
      country: cleanPlace(user.country),
    }))
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
