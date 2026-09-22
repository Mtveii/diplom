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
  city: string
  country: string
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Группировка онлайн-пользователей по странам (пустые страны пропускаем), сортировка по убыванию. */
export function groupUsersByCountry(users: readonly GeoPointInput[]): CountryCount[] {
  const byCountry = new Map<string, number>()
  for (const user of users) {
    const country = user.country?.trim()
    if (!country) {
      continue
    }
    byCountry.set(country, (byCountry.get(country) ?? 0) + 1)
  }
  return [...byCountry.entries()]
    .map(([country, count]) => ({ country, users: count }))
    .sort((a, b) => b.users - a.users)
}

/** Точки для глобуса: только с валидными координатами. */
export function toGlobePoints(users: readonly GeoPointInput[]): GeoPoint[] {
  return users
    .filter((user) => isFiniteNumber(user.lat) && isFiniteNumber(user.lng))
    .map((user) => ({
      lat: user.lat as number,
      lng: user.lng as number,
      city: user.city?.trim() || '?',
      country: user.country?.trim() || '?',
    }))
}
