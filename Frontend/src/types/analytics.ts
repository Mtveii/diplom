/** Утримання по днях: GET /api/Analytics/retention (Slush API). */
export interface RetentionPointDto {
  day: number
  retentionRate: number
}

/** Ризик відтоку: GET /api/Analytics/churn-risk (Slush API). */
export interface ChurnRiskDto {
  userId: string
  username: string | null
  email: string | null
  daysInactive: number
}

/** Когорта: GET /api/Analytics/cohorts (Slush API). */
export interface CohortRowDto {
  month: string | null
  totalUsers: number
  retentionByMonth: number[] | null
}

/** Порівняння періодів: GET /api/Analytics/compare (Slush API). */
export interface PeriodComparisonDto {
  usersPeriodA: number
  usersPeriodB: number
  usersGrowthPercent: number
  activePeriodA: number
  activePeriodB: number
  activeGrowthPercent: number
}

/** Запис журналу: GET /api/Audit/logs (Slush API). */
export interface AdminActionLogDto {
  id: string
  adminUsername: string | null
  action: string | null
  entityName: string | null
  entityId: string | null
  details: string | null
  timestamp: string
}

/** Формат серверного звіту: ReportFormat { Pdf = 0, Excel = 1 } (історія проєкту). */
export type ReportFormat = 0 | 1
