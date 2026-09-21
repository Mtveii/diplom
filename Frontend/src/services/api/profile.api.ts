import { httpClient } from './httpClient'
import type { SteamProfileCountersDto, SteamProfileDto, SteamProfileGameDto } from '@/types/steam'

/** Сырые формы Slush API: GET /api/UserProfile/{username}(/games). */
interface SlushBadgeDto {
  id: string | null
  title: string | null
  description: string | null
  points: number | null
  imageUrl: string | null
  earnedAt: string | null
}

interface SlushFriendDto {
  id: string | null
  username: string | null
  avatarUrl: string | null
  level: number | null
}

interface SlushCountersDto {
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

interface SlushProfileDto {
  id: string | null
  username: string | null
  status: string | null
  bio: string | null
  avatarUrl: string | null
  coverUrl: string | null
  level: number | null
  currentXp: number | null
  maxXp: number | null
  counters: SlushCountersDto | null
  badges: SlushBadgeDto[] | null
  friends: SlushFriendDto[] | null
}

interface SlushProfileGameDto {
  id: string | null
  title: string | null
  imageUrl: string | null
  price: number
}

interface SlushPagedResultDto<T> {
  items: T[] | null
  totalCount: number
  page: number
  pageSize: number
}

const EMPTY_COUNTERS: SteamProfileCountersDto = {
  badges: 0,
  games: 0,
  wishlist: 0,
  discussions: 0,
  screenshots: 0,
  videos: 0,
  guides: 0,
  reviews: 0,
  friends: 0,
}

export const profileApi = {
  /** Steam-профіль за username. 404 (немає зв'язку) → null, секція ховається. */
  getProfile: async (username: string): Promise<SteamProfileDto | null> => {
    try {
      const raw = await httpClient.get<SlushProfileDto>(`/UserProfile/${encodeURIComponent(username)}`).then((r) => r.data)
      return {
        id: raw.id,
        username: raw.username,
        status: raw.status,
        bio: raw.bio,
        avatarUrl: raw.avatarUrl,
        coverUrl: raw.coverUrl,
        level: raw.level,
        currentXp: raw.currentXp,
        maxXp: raw.maxXp,
        counters: raw.counters ?? { ...EMPTY_COUNTERS },
        badges: (raw.badges ?? []).map((badge) => ({
          id: badge.id,
          title: badge.title,
          description: badge.description,
          points: badge.points,
          imageUrl: badge.imageUrl,
          earnedAt: badge.earnedAt,
        })),
        friends: (raw.friends ?? []).map((friend) => ({
          id: friend.id,
          username: friend.username,
          avatarUrl: friend.avatarUrl,
          level: friend.level,
        })),
      }
    } catch (err) {
      console.warn('[profileApi] Steam-профіль не знайдено', err)
      return null
    }
  },

  getGames: async (username: string, pageSize = 12): Promise<SteamProfileGameDto[]> => {
    try {
      const raw = await httpClient
        .get<SlushPagedResultDto<SlushProfileGameDto>>(`/UserProfile/${encodeURIComponent(username)}/games`, {
          params: { page: 1, pageSize },
        })
        .then((r) => r.data)
      return (raw.items ?? []).map((game) => ({
        id: game.id,
        title: game.title,
        imageUrl: game.imageUrl,
        price: game.price,
      }))
    } catch (err) {
      console.warn('[profileApi] Ігри профілю не завантажено', err)
      return []
    }
  },
}
