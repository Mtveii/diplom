export interface HealthComponentDto {
  name: string
  healthy: boolean
  message: string
  latencyMs: number | null
}

export interface SystemHealthDto {
  status: 'Healthy' | 'Degraded'
  timestampUtc: string
  uptime: string
  version: string
  components: HealthComponentDto[]
}
