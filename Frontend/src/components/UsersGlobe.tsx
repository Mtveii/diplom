import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import * as THREE from 'three'
import { useGlobeUsers } from '../hooks/useGlobeUsers'
import { useLocale } from '@/hooks/useLocale'
import { getSunVector, resolveGlobeMode } from '@/utils/geo'

interface Point {
  lat: number
  lng: number
  city: string
  size: number
  color: string
}

// Дневная Blue Marble 2048px. Если CDN недоступен — проверенный earth-day из примеров three-globe.
const DAY_TEXTURE_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_atmos_2048.jpg'
const DAY_FALLBACK_URL = 'https://unpkg.com/three-globe@2.38.0/example/img/earth-day.jpg'
const BUMP_TEXTURE_URL = 'https://unpkg.com/three-globe@2.38.0/example/img/earth-topology.png'

// Спутниковые снимки Esri World Imagery — подтягиваются тайлами по мере приближения.
const esriTileUrl = (x: number, y: number, level: number): string =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${level}/${y}/${x}`

// Освещение: яркое солнце = чёткий терминатор день/ночь, тусклый ambient —
// ночная сторона тёмная, но не проваливается в черноту.
const SUN_INTENSITY = 2.4
const NIGHT_AMBIENT_INTENSITY = 0.35
const FLAT_AMBIENT_INTENSITY = 1.1

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) !== null
  } catch {
    return false
  }
}

export function UsersGlobe() {
  const { t } = useLocale()
  const users = useGlobeUsers()
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  // Вблизи — обычные спутниковые снимки (без дня/ночи), издалека — день/ночь по солнцу.
  const [tilesOn, setTilesOn] = useState(false)
  const [dayTextureUrl, setDayTextureUrl] = useState(DAY_TEXTURE_URL)

  // Источники света создаём один раз и переиспользуем — иначе при каждом
  // переключении режима в сцене копились бы дубликаты.
  const lightRig = useMemo(
    () => ({
      ambient: new THREE.AmbientLight(0x8fb4d8, NIGHT_AMBIENT_INTENSITY),
      sun: new THREE.DirectionalLight(0xffffff, SUN_INTENSITY),
    }),
    [],
  )

  // Предзагрузка дневной текстуры: при ошибке CDN переключаемся на запасной URL
  // до того, как three-globe начнёт её тянуть (иначе планета останется чёрной).
  useEffect(() => {
    let cancelled = false
    const probeTexture = new THREE.TextureLoader().load(
      DAY_TEXTURE_URL,
      undefined,
      undefined,
      () => {
        if (!cancelled) {
          setDayTextureUrl(DAY_FALLBACK_URL)
        }
      },
    )
    return () => {
      cancelled = true
      probeTexture.dispose()
    }
  }, [])

  const applyLights = useCallback(
    (tilesMode: boolean) => {
      const globe = globeRef.current
      if (!globe) {
        return
      }
      const sun = getSunVector(new Date())
      lightRig.sun.position.set(sun.x * 1000, sun.y * 1000, sun.z * 1000)
      if (tilesMode) {
        // Вблизи: ровный свет без терминатора — «обычная» карта.
        lightRig.sun.intensity = 0
        lightRig.ambient.intensity = FLAT_AMBIENT_INTENSITY
        lightRig.ambient.color.set(0xffffff)
      } else {
        lightRig.sun.intensity = SUN_INTENSITY
        lightRig.ambient.intensity = NIGHT_AMBIENT_INTENSITY
        lightRig.ambient.color.set(0x8fb4d8)
      }
      globe.lights([lightRig.ambient, lightRig.sun])
    },
    [lightRig],
  )

  // Солнце движется + смена режима по зуму — применяем актуальный свет.
  useEffect(() => {
    applyLights(tilesOn)
  }, [tilesOn, applyLights])

  useEffect(() => {
    const timer = window.setInterval(() => applyLights(tilesOn), 60_000)
    return () => window.clearInterval(timer)
  }, [tilesOn, applyLights])

  const handleGlobeReady = useCallback(() => {
    applyLights(false)
  }, [applyLights])

  const handleZoom = useCallback(() => {
    const altitude = globeRef.current?.pointOfView()?.altitude
    if (typeof altitude !== 'number') {
      return
    }
    setTilesOn((prev) => resolveGlobeMode(altitude, prev))
  }, [])

  // Без WebGL three.js кидає при монтуванні — показуємо заглушку одразу,
  // не чекаючи ErrorBoundary (див. CommandCenterPage).
  if (!isWebGLAvailable()) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs text-slate-500">
        {t.commandCenter.globeFallback}
      </div>
    )
  }
  const unknown = t.geo.unknown

  const points: Point[] = users.map((u) => ({
    lat: u.lat,
    lng: u.lng,
    city: `${u.city ?? unknown}, ${u.country ?? unknown}`,
    size: 0.6,
    color: '#34d399', // success green / teal
  }))

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      <Globe
        ref={globeRef}
        globeImageUrl={dayTextureUrl}
        bumpImageUrl={BUMP_TEXTURE_URL}
        globeTileEngineUrl={tilesOn ? esriTileUrl : null}
        onZoom={handleZoom}
        onGlobeReady={handleGlobeReady}
        backgroundColor="rgba(0,0,0,0)"
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={0.02}
        pointRadius="size"
        pointLabel="city"
        pointsMerge={false}
        atmosphereColor="#34d399"
        atmosphereAltitude={0.15}
      />
    </div>
  )
}
