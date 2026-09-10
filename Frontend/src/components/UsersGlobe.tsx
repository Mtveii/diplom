import Globe from 'react-globe.gl'
import { useGlobeUsers } from '../hooks/useGlobeUsers'

interface Point {
  lat: number
  lng: number
  city: string
  size: number
  color: string
}

export function UsersGlobe() {
  const users = useGlobeUsers()

  const points: Point[] = users.map((u) => ({
    lat: u.lat,
    lng: u.lng,
    city: `${u.city}, ${u.country}`,
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
