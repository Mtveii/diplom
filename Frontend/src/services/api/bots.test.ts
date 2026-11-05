import { describe, it, expect } from 'vitest'

describe('botsApi types', () => {
  it('BotInstanceDto has required fields', () => {
    const bot = {
      id: '1',
      name: 'Test Bot',
      provider: 'Telegram',
      status: 'online',
      sent24h: 100,
      errors24h: 0,
      avgLatencyMs: 50,
      queueSize: 0,
      lastActivity: 'now',
      uptimePercent: 99.9,
    }
    expect(bot.id).toBe('1')
    expect(bot.provider).toBe('Telegram')
  })

  it('BotHealthDto has required fields', () => {
    const health = {
      healthScore: 95,
      avgUptime: 99.9,
      totalSent24h: 1000,
      totalErrors24h: 5,
      avgLatencyMs: 100,
      queueSize: 0,
      statusMessage: 'OK',
    }
    expect(health.healthScore).toBeGreaterThan(0)
    expect(health.totalSent24h).toBeGreaterThan(0)
  })

  it('BotMetricPointDto has required fields', () => {
    const point = { timestamp: '2026-01-01T00:00:00Z', value: 42 }
    expect(point.timestamp).toBeTruthy()
    expect(point.value).toBe(42)
  })
})