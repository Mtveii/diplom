import { describe, expect, it } from 'vitest'
import { mapFriend, mapFriendRequest } from './friends.api'

describe('mapFriend', () => {
  it('maps full backend shape', () => {
    expect(mapFriend({ id: 'u1', username: 'Begudi', avatarUrl: 'https://x/1.png', level: 12 })).toMatchObject({
      id: 'u1',
      username: 'Begudi',
      avatarUrl: 'https://x/1.png',
      level: 12,
    })
  })

  it('tolerates numeric id and missing optionals', () => {
    expect(mapFriend({ id: 7 })).toMatchObject({ id: '7', avatarUrl: null, level: 0 })
  })

  it('drops broken records', () => {
    expect(mapFriend(null)).toBeNull()
    expect(mapFriend(undefined)).toBeNull()
    expect(mapFriend({})).toBeNull()
  })
})

describe('mapFriendRequest', () => {
  it('prefers requestId and nested user', () => {
    expect(
      mapFriendRequest({ id: 'x', requestId: 'r9', user: { username: 'Skibidiboy228' }, createdAt: '2026-08-22T10:00:00Z' }),
    ).toMatchObject({ id: 'r9', username: 'Skibidiboy228', createdAt: '2026-08-22T10:00:00Z' })
  })

  it('falls back to flat fields', () => {
    expect(mapFriendRequest({ id: 'r1', username: 'Begudi' })).toMatchObject({ id: 'r1', username: 'Begudi', createdAt: null })
  })

  it('drops records without id', () => {
    expect(mapFriendRequest(null)).toBeNull()
    expect(mapFriendRequest({ username: 'Ghost' })).toBeNull()
  })
})
