export interface DashboardSummaryDto {
  totalMembers: number
  onlineNow: number
  playersToday: number
  activeThisWeek: number
  pendingApplications: number
  activeAlerts: number
  networkStabilityPercent?: number
}

/** Пользователь сети Slush с гео-координатами (GET /Monitoring/online). */
export interface OnlineUserDto {
  steamId: string
  nickname: string
  status: string
  currentGame: string | null
  playtimeHours: number
  lat: number
  lng: number
  city: string
  country: string
}

/** Точка графика «Топ игр» (GET /Monitoring/game-trends). */
export interface TopGamesPointDto {
  name: string
  count: number
}

export interface OnlineStatusDto {
  steamId64: string
  isOnline: boolean
  gameId: number | null
  gameName: string | null
  timestamp: string
}

export interface ActivityPointDto {
  timestamp: string
  onlineCount: number
}

export interface HeatmapPointDto {
  dayOfWeek: number
  hour: number
  activeCount: number
}

export interface TopPlayerDto {
  steamId64: string
  username: string
  minutesPlayed: number
  hoursPlayed: number
}

export interface GameTrendPointDto {
  timestamp: string
  price: number | null
  discountPercent: number | null
  positiveReviewPercent: number | null
  totalReviews: number | null
}

export interface AchievementComparisonDto {
  achievementId: string
  name: string | null
  clanUnlockPercent: number
  globalUnlockPercent: number | null
  clanOwners: number
}

export interface GameMonitorDto {
  appId: number
  name: string
  currentPrice: number | null
  currentDiscountPercent: number | null
  positiveReviewPercent: number | null
  totalReviews: number | null
  trend: GameTrendPointDto[]
  achievements: AchievementComparisonDto[]
  clanOwners: number
}