import { httpClient } from './httpClient'
import { getLocaleDictionary } from '@/store/localeStore'
import type { HealthComponentDto, SystemHealthDto } from '@/types/health'

/** Сырая форма Slush API: GET /api/Health/detailed (был неверный URL /health). */
interface SlushHealthDto {
  databaseStatus: string | null
  externalApiStatus: string | null
  overallStatus: string | null
  timestamp: string
}

function toComponent(name: string, status: string | null): HealthComponentDto {
  return {
    name,
    healthy: status === 'Healthy',
    message: status ?? getLocaleDictionary().common.noData,
    latencyMs: null,
  }
}

export const healthApi = {
  getHealth: async (): Promise<SystemHealthDto> => {
    const raw = await httpClient.get<SlushHealthDto>('/Health/detailed').then((r) => r.data)
    const dict = getLocaleDictionary()
    return {
      status: raw.overallStatus === 'Healthy' ? 'Healthy' : 'Degraded',
      timestampUtc: raw.timestamp,
      uptime: null,
      version: null,
      components: [
        toComponent(dict.health.db, raw.databaseStatus),
        toComponent(dict.health.externalApi, raw.externalApiStatus),
      ],
    }
  },
}
