import Globe from 'react-globe.gl'
import { useGlobeUsers } from '../hooks/useGlobeUsers'
import { useLocale } from '@/hooks/useLocale'

interface Point {
  lat: number
  lng: number
  city: string
  size: number
  color: string
}

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
        globeImageUrl="https://unpkg.com/three-globe@2.38.0/example/img/earth-night.jpg"
        bumpImageUrl="https://unpkg.com/three-globe@2.38.0/example/img/earth-topology.png"
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
