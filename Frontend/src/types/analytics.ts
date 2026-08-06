export interface RetentionPointDto {
  day: number
  retainedPercent: number
  cohortSize: number
}

export interface ChurnRiskDto {
  steamId64: string
  username: string
  daysWithoutLogin: number
  riskScore: number
}

export interface PeriodComparisonDto {
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  previousPeriodStart: string | null
  previousPeriodEnd: string | null
  currentActivePlayers: number
  previousActivePlayers: number
  activePlayersChangePercent: number
  currentPlaytimeMinutes: number
  previousPlaytimeMinutes: number
  playtimeChangePercent: number
  currentAverageDailyOnline: number
  previousAverageDailyOnline: number
  averageOnlineChangePercent: number
}

export interface CohortRowDto {
  cohortMonth: string
  cohortSize: number
  points: RetentionPointDto[]
}

export type ReportFormat = 'Pdf' | 'Excel'