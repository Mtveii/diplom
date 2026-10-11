import { describe, expect, it } from 'vitest'
import { mapRule } from './alerts.api'

describe('mapRule (string enums from Slush API)', () => {
  it('passes backend names through', () => {
    const mapped = mapRule({
      id: '1',
      ruleName: 'Critical drop',
      ruleType: 'ClanOnlineDrop',
      condition: 'LessThan',
      threshold: 500,
      channel: 'Telegram',
      isEnabled: true,
    })
    expect(mapped).toMatchObject({
      id: '1',
      name: 'Critical drop',
      type: 'ClanOnlineDrop',
      condition: 'LessThan',
      thresholdValue: 500,
      channel: 'Telegram',
      isActive: true,
    })
  })

  it('tolerates legacy int enums by backend order', () => {
    const mapped = mapRule({
      id: '2',
      ruleName: null,
      ruleType: 1,
      condition: 2,
      threshold: 10,
      channel: 3,
      isEnabled: false,
    })
    expect(mapped.type).toBe('PlayerOffline')
    expect(mapped.condition).toBe('Equals')
    expect(mapped.channel).toBe('Web')
    expect(mapped.isActive).toBe(false)
  })

  it('passes unknown names through (backend may add channels)', () => {
    const mapped = mapRule({
      id: '3',
      ruleName: 'x',
      ruleType: 'NoSuchType',
      condition: 'LessThan',
      threshold: 1,
      channel: 'CarrierPigeon',
      isEnabled: true,
    })
    expect(mapped.type).toBe('NoSuchType')
    expect(mapped.channel).toBe('CarrierPigeon')
  })
})
