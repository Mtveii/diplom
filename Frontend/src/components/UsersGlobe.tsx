import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import * as THREE from 'three'
import { useGlobeUsers } from '../hooks/useGlobeUsers'
import { useLocale } from '@/hooks/useLocale'
import {
  buildPacketRouteArcs,
  clusterAltitude,
  clusterGeoPoints,
  clusterRadius,
  easePacketFlight,
  FAKE_WORLD_USERS,
  getSunVector,
  packetPosition,
  packetSendProbability,
  PACKET_FLIGHT_MS,
  randomWaveDelayMs,
  resolveGlobeMode,
  type ChatArc,
  type GeoPoint,
} from '@/utils/geo'

interface Point {
  lat: number
  lng: number
  city: string
  size: number
  color: string
  alt: number
}

/** Одновременно в полёте — не больше дюжины линий ради перфа. */
const MAX_PACKET_FLIGHTS = 12

/** Точек на хвост: three-globe всё равно доинтерполирует (pathResolution), 16 хватает. */
const TRAIL_POINTS = 16
/** Обновляем хвосты каждый второй кадр (~30fps вместо 60): полёт 1.5 сек всё равно гладкий. */
const TICK_FRAME_SKIP = 2
/**
 * Толщина линии перелёта в пикселях: three-globe кладёт значение напрямую
 * в linewidth FatLine-материала. Работает только вместе с rendererSize
 * (см. globeSizeProps): без него FatLine чернеет.
 */
const TRAIL_STROKE = 2
/** Полная линия «юзер → юзер» висит ещё секунду после прибытия пакета. */
const TRAIL_HOLD_MS = 1000
/** Последняя часть холда — плавное затухание вместо резкого исчезновения. */
const TRAIL_FADE_MS = 500

/**
 * Растущий хвост полёта — точные точки настоящей параболы от юзера-отправителя
 * до текущего фронта (без бегающей точки — растёт сама линия).
 * Слой pathsData рисует их одной непрерывной объёмной FatLine: привязана
 * к отправителю с первого кадра и не отрывается, пока не дойдёт до получателя.
 */
interface TrailPathDatum {
  pts: PathPoint[]
  label: string
  /** Цвет линии: летящим — чистый белый, долетевшим — белый с затухающей alpha. */
  color: string
}

/** Белый с прозрачностью 0..1 — three-globe сам выставит opacity материалу. */
function fadeWhite(alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha))
  return `rgba(255, 255, 255, ${clamped.toFixed(3)})`
}

interface PathPoint {
  lat: number
  lng: number
  alt: number
}

/**
 * three-globe умеет rendererSize (размер канваса для FatLine-линий),
 * но в типах react-globe.gl@2.38 его нет — пробрасываем через spread,
 * рантайм все пропсы отдаёт внутрь как есть.
 */
function globeSizeProps(size: THREE.Vector2): object {
  return { rendererSize: size }
}

interface PacketFlight {
  arc: ChatArc
  t0: number
  /** Длительность именно этого перелёта, мс (сейчас всем одинаково — PACKET_FLIGHT_MS). */
  durationMs: number
}

/** Долетевший пакет: полная линия висит до конца TRAIL_HOLD_MS. */
interface LandedFlight {
  arc: ChatArc
  landedAt: number
}

/**
 * Пролётная часть параболы точками: от юзера-1 (u = 0) до фронта (u = easedT).
 * easedT уже после easePacketFlight. Меньше двух точек — линии нет.
 */
function trailPoints(arc: ChatArc, easedT: number): PathPoint[] {
  if (!(easedT > 0.001)) {
    return []
  }
  const pts: PathPoint[] = []
  for (let i = 0; i <= TRAIL_POINTS; i++) {
    const position = packetPosition(arc, (easedT * i) / TRAIL_POINTS)
    pts.push({ lat: position.lat, lng: position.lng, alt: position.alt })
  }
  return pts
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

  // Высота точки берётся из даты (alt кластера); без неё — у поверхности.
  const pointAltitudeAccessor = useCallback((datum: unknown): number => {
    if (typeof datum === 'object' && datum !== null && 'alt' in datum) {
      const altitude = (datum as { alt?: unknown }).alt
      return typeof altitude === 'number' && Number.isFinite(altitude) ? altitude : 0.02
    }
    return 0.02
  }, [])

  // Реальные юзеры + 40 фейковых по миру (янтарные, с префиксом Demo):
  // иначе при пустом онлайне глобус мёртвый. Фейки участвуют в дугах и пакетах.
  const allUsers = useMemo<GeoPoint[]>(
    () => [
      ...users,
      ...FAKE_WORLD_USERS.map((fake) => ({
        lat: fake.lat,
        lng: fake.lng,
        city: fake.city,
        country: fake.country,
        nickname: fake.nickname,
        isFake: true,
        population: fake.population,
      })),
    ],
    [users],
  )

  // Актуальный список юзеров для волн (ref, чтобы таймер не пересоздавался).
  const allUsersRef = useRef(allUsers)
  allUsersRef.current = allUsers

  // Пакеты в полёте: фронт считает rAF-цикл, состояние — только для отрисовки.
  // Долетевшие линии держим отдельно — они гаснут через TRAIL_HOLD_MS после прибытия.
  const flightsRef = useRef<PacketFlight[]>([])
  const landedRef = useRef<LandedFlight[]>([])
  const [trailPaths, setTrailPaths] = useState<TrailPathDatum[]>([])

  // Волна: каждый юзер с вероятностью packetSendProbability решает отправить
  // пакет случайному другому юзеру. Вероятность падает с ростом онлайна.
  // Длительность перелёта — PACKET_FLIGHT_MS (1.5 сек).
  const spawnWave = useCallback(() => {
    const users = allUsersRef.current
    const picked = buildPacketRouteArcs(users, packetSendProbability(users.length), Math.random, MAX_PACKET_FLIGHTS)
    if (picked.length === 0) {
      return
    }
    const now = performance.now()
    const alive = flightsRef.current.filter((flight) => now - flight.t0 < flight.durationMs)
    const fresh = picked.map((arc) => ({ arc, t0: now, durationMs: PACKET_FLIGHT_MS }))
    flightsRef.current = [...alive, ...fresh].slice(-MAX_PACKET_FLIGHTS)
  }, [])

  // Волна сразу при смене данных (новые реальные юзеры — без задержки),
  // дальше — случайные паузы 1–2.5 секунды между волнами.
  useEffect(() => {
    let stopped = false
    let timer = 0
    const scheduleNext = () => {
      timer = window.setTimeout(
        () => {
          if (stopped) {
            return
          }
          spawnWave()
          scheduleNext()
        },
        randomWaveDelayMs(),
      )
    }
    spawnWave()
    scheduleNext()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [allUsers, spawnWave])

  // rAF-цикл живёт пока есть пакеты в воздухе; пустой кадр стейт не трогает.
  // За кадр пересчитываем фронты растущих линий одним проходом.
  // Линия привязана к юзеру-1 с первого кадра и не отрывается,
  // пока фронт не дойдёт до юзера-2. Долетевшая висит TRAIL_HOLD_MS
  // и плавно гаснет в последние TRAIL_FADE_MS.
  useEffect(() => {
    let frame = 0
    let frameNo = 0
    const tick = () => {
      frame = window.requestAnimationFrame(tick)
      frameNo += 1
      if (frameNo % TICK_FRAME_SKIP !== 0) {
        return
      }
      const now = performance.now()
      const alive: PacketFlight[] = []
      for (const flight of flightsRef.current) {
        if (now - flight.t0 < flight.durationMs) {
          alive.push(flight)
        } else {
          landedRef.current = [...landedRef.current, { arc: flight.arc, landedAt: now }].slice(-MAX_PACKET_FLIGHTS)
        }
      }
      flightsRef.current = alive
      landedRef.current = landedRef.current.filter((landed) => now - landed.landedAt < TRAIL_HOLD_MS)
      if (alive.length === 0 && landedRef.current.length === 0) {
        setTrailPaths((prev) => (prev.length > 0 ? [] : prev))
        return
      }
      const trails: TrailPathDatum[] = []
      for (const flight of alive) {
        const easedT = easePacketFlight((now - flight.t0) / flight.durationMs)
        const pts = trailPoints(flight.arc, easedT)
        if (pts.length > 1) {
          trails.push({ pts, label: flight.arc.label, color: '#ffffff' })
        }
      }
      for (const landed of landedRef.current) {
        const age = now - landed.landedAt
        const alpha = age <= TRAIL_HOLD_MS - TRAIL_FADE_MS ? 1 : 1 - (age - (TRAIL_HOLD_MS - TRAIL_FADE_MS)) / TRAIL_FADE_MS
        trails.push({ pts: trailPoints(landed.arc, 1), label: landed.arc.label, color: fadeWhite(alpha) })
      }
      setTrailPaths(trails)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const unknown = t.geo.unknown

  // Мемоизируем обязательно: без этого новый массив точек каждый кадр
  // заставлял three-globe сносить и пересоздавать все меши 60 раз в секунду.
  // Маркеры — кластеры: столб растёт ввысь и вширь с числом юзеров
  // в месте (10 выше и шире, чем 5), у фейков — с населением города
  // (Токио выше и шире Сиднея). Маркер ≈4px при дефолтном зуме
  // (точные пиксели невозможны — цилиндры 3D и растут вместе с зумом).
  // Хук до раннего return — иначе нарушится порядок хуков.
  const points: Point[] = useMemo(
    () =>
      clusterGeoPoints(allUsers).map((cluster) => ({
        lat: cluster.lat,
        lng: cluster.lng,
        city:
          `${cluster.city ?? unknown}, ${cluster.country ?? unknown}` +
          (cluster.count > 1 ? ` ×${cluster.count}` : ''),
        size: clusterRadius(cluster.count, cluster.population),
        color: cluster.hasReal ? '#34d399' : '#f59e0b', // зелёный = реальные, янтарный = только фейки
        alt: clusterAltitude(cluster.count, cluster.population),
      })),
    [allUsers, unknown],
  )

  // Размер канваса для FatLine-линий: без rendererSize three-globe ставит
  // resolution в undefined и линии чернеют. Синкаем через ResizeObserver.
  const containerRef = useRef<HTMLDivElement>(null)
  const [rendererSize, setRendererSize] = useState(() => new THREE.Vector2(1, 1))
  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }
    const syncSize = () => {
      const rect = element.getBoundingClientRect()
      setRendererSize((prev) => {
        if (prev.x === rect.width && prev.y === rect.height) {
          return prev
        }
        return new THREE.Vector2(rect.width, rect.height)
      })
    }
    syncSize()
    const observer = new ResizeObserver(syncSize)
    observer.observe(element)
    return () => observer.disconnect()
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

  return (
    <div ref={containerRef} className="relative h-full w-full flex items-center justify-center overflow-hidden">
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
        pointAltitude={pointAltitudeAccessor}
        pointRadius="size"
        pointLabel="city"
        pointsMerge={false}
        pointsTransitionDuration={0}
        pathsData={trailPaths}
        pathPoints="pts"
        pathPointLat="lat"
        pathPointLng="lng"
        pathPointAlt="alt"
        pathColor="color"
        pathStroke={TRAIL_STROKE}
        pathResolution={1}
        pathTransitionDuration={0}
        {...globeSizeProps(rendererSize)}
        atmosphereColor="#34d399"
        atmosphereAltitude={0.15}
      />
    </div>
  )
}
