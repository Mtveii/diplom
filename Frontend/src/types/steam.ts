export interface SteamPlayerSummaryDto {
  steamId64: string
  nickname: string | null
  avatarUrl: string | null
  avatarMediumUrl: string | null
  avatarFullUrl: string | null
  personaState: number
  gameId: string | null
  gameExtraInfo: string | null
  lastLogOff: string | null
  lastSeen: string | null
  profileVisible: boolean | null
}

export interface OwnedGameDto {
  appId: number
  name: string | null
  playtimeMinutesTotal: number
  playtimeMinutesLastTwoWeeks: number
  logoUrl: string | null
}

export interface SteamNewsItemDto {
  id: number
  title: string | null
  url: string | null
  author: string | null
  date: string | null
  feedLabel: string | null
}

export interface GameSearchResultDto {
  appId: number
  name: string
}

export interface SteamProfileBadgeDto {
  id: string | null
  title: string | null
  description: string | null
  points: number | null
  imageUrl: string | null
  earnedAt: string | null
}

export interface SteamProfileFriendDto {
  id: string | null
  username: string | null
  avatarUrl: string | null
  level: number | null
}

export interface SteamProfileCountersDto {
  badges: number
  games: number
  wishlist: number
  discussions: number
  screenshots: number
  videos: number
  guides: number
  reviews: number
  friends: number
}

/** Steam-профіль: GET /api/UserProfile/{username} (Slush API). */
export interface SteamProfileDto {
  id: string | null
  username: string | null
  status: string | null
  bio: string | null
  avatarUrl: string | null
  coverUrl: string | null
  level: number | null
  currentXp: number | null
  maxXp: number | null
  counters: SteamProfileCountersDto | null
  badges: SteamProfileBadgeDto[]
  friends: SteamProfileFriendDto[]
}

export interface SteamProfileGameDto {
  id: string | null
  title: string | null
  imageUrl: string | null
  price: number
}