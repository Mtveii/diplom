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