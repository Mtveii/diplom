import { httpClient } from './httpClient'
import type {
  AdminActionLogDto,
  ChurnRiskDto,
  CohortRowDto,
  PeriodComparisonDto,
  ReportFormat,
  RetentionPointDto,
} from '@/types/analytics'

interface SlushPagedResultDto<T> {
  items: T[] | null
  totalCount: number
  page: number
  pageSize: number
}

export interface AuditPageDto {
  items: AdminActionLogDto[]
  totalCount: number
}

export const analyticsApi = {
  retention: (): Promise<RetentionPointDto[]> =>
    httpClient.get<RetentionPointDto[]>('/Analytics/retention').then((r) => r.data ?? []),

  churnRisk: (): Promise<ChurnRiskDto[]> =>
    httpClient.get<ChurnRiskDto[]>('/Analytics/churn-risk').then((r) => r.data ?? []),

  cohorts: (months = 6): Promise<CohortRowDto[]> =>
    httpClient.get<CohortRowDto[]>('/Analytics/cohorts', { params: { months } }).then((r) => r.data ?? []),

  compare: (): Promise<PeriodComparisonDto | null> =>
    httpClient
      .get<PeriodComparisonDto>('/Analytics/compare')
      .then((r) => r.data)
      .catch((err: unknown) => {
        console.warn('[analyticsApi] Порівняння періодів недоступне', err)
        return null
      }),

  /** Експорт звіту з сервера (PDF/Excel). Імʼя файлу — з Content-Disposition або за форматом. */
  exportReport: async (format: ReportFormat): Promise<void> => {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 30 * 24 * 3600_000)
    const response = await httpClient.post('/Analytics/export', {
      reportType: 0,
      format,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }, { responseType: 'blob' })
    const disposition: string = response.headers['content-disposition'] ?? ''
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition)
    const fileName = (match?.[1] ?? '').replace(/['"]/g, '') || (format === 0 ? 'report.pdf' : 'report.xlsx')
    const url = window.URL.createObjectURL(new Blob([response.data as BlobPart], { type: response.headers['content-type'] as string | undefined }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}

export const auditApi = {
  getLogs: async (page = 1, pageSize = 50): Promise<AuditPageDto> => {
    const raw = await httpClient
      .get<SlushPagedResultDto<AdminActionLogDto>>('/Audit/logs', { params: { page, pageSize } })
      .then((r) => r.data)
    return { items: raw.items ?? [], totalCount: raw.totalCount }
  },
}
