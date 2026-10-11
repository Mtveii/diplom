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

const COMPARE_WINDOW_DAYS = 30

/** Вікна порівняння: A = останні 30 днів, B = 30 днів перед ними. */
export function buildComparePeriods(now: Date = new Date()): { fromA: string; toA: string; fromB: string; toB: string } {
  const dayMs = 24 * 3600_000
  const toA = now.toISOString()
  const fromA = new Date(now.getTime() - COMPARE_WINDOW_DAYS * dayMs).toISOString()
  const toB = fromA
  const fromB = new Date(now.getTime() - 2 * COMPARE_WINDOW_DAYS * dayMs).toISOString()
  return { fromA, toA, fromB, toB }
}

export const analyticsApi = {
  retention: (): Promise<RetentionPointDto[]> =>
    httpClient.get<RetentionPointDto[]>('/Analytics/retention').then((r) => r.data ?? []),

  churnRisk: (): Promise<ChurnRiskDto[]> =>
    httpClient.get<ChurnRiskDto[]>('/Analytics/churn-risk').then((r) => r.data ?? []),

  /** Бекенд GetCohorts() без параметрів — зайвий ?months ігнорувався б сервером. */
  cohorts: (): Promise<CohortRowDto[]> =>
    httpClient.get<CohortRowDto[]>('/Analytics/cohorts').then((r) => r.data ?? []),

  /**
   * Бекенд вимагає fromA/toA/fromB/toB (порівняння періодів).
   * Дефолт: останні 30 днів проти попередніх 30.
   */
  compare: (): Promise<PeriodComparisonDto | null> =>
    httpClient
      .get<PeriodComparisonDto>('/Analytics/compare', { params: buildComparePeriods() })
      .then((r) => r.data)
      .catch((err: unknown) => {
        console.warn('[analyticsApi] Порівняння періодів недоступне', err)
        return null
      }),

  /** Експорт звіту з сервера (PDF/Excel). Імʼя файлу — з Content-Disposition або за форматом. */
  exportReport: async (format: ReportFormat): Promise<void> => {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 30 * 24 * 3600_000)
    // Бэкенд ждёт имена enum (JsonStringEnumConverter): ReportType { RetentionSummary, ActivityReport }.
    const response = await httpClient.post('/Analytics/export', {
      reportType: 'RetentionSummary',
      format: format === 0 ? 'Pdf' : 'Excel',
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
