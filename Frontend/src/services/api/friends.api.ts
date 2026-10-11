import { httpClient } from './httpClient'
import { getLocaleDictionary } from '@/store/localeStore'
import type { FriendDto, FriendRequestDto } from '@/types/notification'

/** Сырые формы Slush API: точные поля недокументированы, всё опционально. */
interface SlushFriendDto {
  id?: string | number | null
  username?: string | null
  avatarUrl?: string | null
  level?: number | null
}

interface SlushFriendUserDto {
  username?: string | null
}

interface SlushFriendRequestDto {
  id?: string | number | null
  requestId?: string | number | null
  username?: string | null
  user?: SlushFriendUserDto | null
  targetUser?: SlushFriendUserDto | null
  createdAt?: string | null
  createdDate?: string | null
}

interface SlushPagedResultDto<T> {
  items: T[] | null
  totalCount: number
}

function toId(value: string | number | null | undefined): string {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value)
  return typeof value === 'string' && value.length > 0 ? value : ''
}

/** Маппинг сырого друга Slush → наш DTO. Кривые записи отсекаем (null). */
export function mapFriend(raw: SlushFriendDto | null | undefined): FriendDto | null {
  if (!raw) return null
  const id = toId(raw.id)
  const username = typeof raw.username === 'string' && raw.username.length > 0 ? raw.username : getLocaleDictionary().common.noName
  if (id.length === 0) return null
  return {
    id,
    username,
    avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : null,
    level: typeof raw.level === 'number' && Number.isFinite(raw.level) ? raw.level : 0,
  }
}

/** Маппинг сырой заявки в друзья → наш DTO. Кривые записи отсекаем (null). */
export function mapFriendRequest(raw: SlushFriendRequestDto | null | undefined): FriendRequestDto | null {
  if (!raw) return null
  const id = toId(raw.requestId ?? raw.id)
  if (id.length === 0) return null
  const nested = raw.user?.username ?? raw.targetUser?.username
  const username =
    (typeof nested === 'string' && nested.length > 0 ? nested : null) ??
    (typeof raw.username === 'string' && raw.username.length > 0 ? raw.username : null) ??
    getLocaleDictionary().common.noName
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : typeof raw.createdDate === 'string' ? raw.createdDate : null
  return { id, username, createdAt }
}

export interface FriendsPageDto {
  items: FriendDto[]
  totalCount: number
}

export interface FriendRequestsPageDto {
  items: FriendRequestDto[]
  totalCount: number
}

async function getPaged<T, R>(url: string, params: Record<string, number>, map: (raw: T) => R | null): Promise<{ items: R[]; totalCount: number }> {
  try {
    const raw = await httpClient.get<SlushPagedResultDto<T>>(url, { params }).then((r) => r.data)
    return {
      items: (raw.items ?? []).map(map).filter((item): item is R => item !== null),
      totalCount: typeof raw.totalCount === 'number' ? raw.totalCount : 0,
    }
  } catch (err) {
    console.warn(`[friendsApi] Не удалось загрузить ${url} — показываю пустые данные`, err)
    return { items: [], totalCount: 0 }
  }
}

export const friendsApi = {
  /** Друзья текущего пользователя: GET /api/Friends. */
  getFriends: (pageSize = 20): Promise<FriendsPageDto> => getPaged<SlushFriendDto, FriendDto>('/Friends', { page: 1, pageSize }, mapFriend),

  /** Входящие заявки: GET /api/Friends/requests/incoming. */
  getIncomingRequests: (pageSize = 8): Promise<FriendRequestsPageDto> =>
    getPaged<SlushFriendRequestDto, FriendRequestDto>('/Friends/requests/incoming', { page: 1, pageSize }, mapFriendRequest),

  /** Исходящие заявки: GET /api/Friends/requests/outgoing. */
  getOutgoingRequests: (pageSize = 1): Promise<FriendRequestsPageDto> =>
    getPaged<SlushFriendRequestDto, FriendRequestDto>('/Friends/requests/outgoing', { page: 1, pageSize }, mapFriendRequest),
}
