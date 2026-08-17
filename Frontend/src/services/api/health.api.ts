import { httpClient } from './httpClient'
import type { SystemHealthDto } from '@/types/health'

export const healthApi = {
  getHealth: async (): Promise<SystemHealthDto> => {
    const { data } = await httpClient.get<SystemHealthDto>('/health')
    return data
  },
}
