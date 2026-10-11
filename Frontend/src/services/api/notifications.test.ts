import { describe, expect, it } from 'vitest'
import { mapSteamNewsItem } from './notifications.api'

describe('mapSteamNewsItem', () => {
  it('maps a real Steam news payload', () => {
    expect(
      mapSteamNewsItem(
        {
          gid: '1844751498226015',
          title: 'Counter-Strike 2 Update',
          url: 'https://steamstore-a.akamaihd.net/news/externalpost/1',
          author: 'jo',
          date: 1790373294,
          feedlabel: 'Community Announcements',
        },
        0,
      ),
    ).toEqual({
      id: 1844751498226015,
      title: 'Counter-Strike 2 Update',
      url: 'https://steamstore-a.akamaihd.net/news/externalpost/1',
      author: 'jo',
      date: new Date(1790373294 * 1000).toISOString(),
      feedLabel: 'Community Announcements',
    })
  })

  it('drops items without title and tolerates missing fields', () => {
    expect(mapSteamNewsItem({ title: null }, 7)).toBeNull()
    expect(mapSteamNewsItem(null as never, 7)).toBeNull()
    expect(mapSteamNewsItem({ title: 'x' }, 7)).toEqual({
      id: 7,
      title: 'x',
      url: null,
      author: null,
      date: null,
      feedLabel: null,
    })
  })
})
