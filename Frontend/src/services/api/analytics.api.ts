import { httpClient } from './httpClient'
import type {
  ChurnRiskDto,
  CohortRowDto,
  PeriodComparisonDto,
  RetentionPointDto,
} from '@/types/analytics'

export const analyticsApi = {
  retention: (days = 90) =>
    httpClient.get<RetentionPointDto[]>('/analytics/retention', { params: { days } }).then((r) => r.data),

  churn: (thresholdDays = 14) =>
    httpClient.get<ChurnRiskDto[]>('/analytics/churn', { params: { thresholdDays } }).then((r) => r.data),

  compare: (currentDays = 7) =>
    httpClient.get<PeriodComparisonDto>('/analytics/compare', { params: { currentDays } }).then((r) => r.data),

  cohorts: (months = 6) =>
    httpClient.get<CohortRowDto[]>('/analytics/cohorts', { params: { months } }).then((r) => r.data),

  export: async (format: 'Pdf' | 'Excel'): Promise<void> => {
    const response = await httpClient.post('/analytics/export', { format }, { responseType: 'blob' })
    const disposition = response.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename="?([^"]+)"?/)
    const fileName = match?.[1] ?? `clan-report.${format === 'Pdf' ? 'pdf' : 'xlsx'}`
    const url = URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  },
}