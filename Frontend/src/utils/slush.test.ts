import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SLUSH_LOGIN_URL, getSlushLoginUrl } from './slush'

afterEach(() => {
  vi.restoreAllMocks()
})

function silenceWarn() {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
}

describe('getSlushLoginUrl', () => {
  it('returns trimmed absolute https URL as is', () => {
    expect(getSlushLoginUrl('  https://slush.example.com/login  ')).toBe('https://slush.example.com/login')
  })

  it('accepts http URLs', () => {
    expect(getSlushLoginUrl('http://localhost:3000/login')).toBe('http://localhost:3000/login')
  })

  it('falls back to default when value is missing', () => {
    silenceWarn()
    expect(getSlushLoginUrl(undefined)).toBe(DEFAULT_SLUSH_LOGIN_URL)
  })

  it('falls back to default on empty string', () => {
    silenceWarn()
    expect(getSlushLoginUrl('   ')).toBe(DEFAULT_SLUSH_LOGIN_URL)
  })

  it('falls back to default for relative paths (they would loop back to guarded routes = 403)', () => {
    silenceWarn()
    expect(getSlushLoginUrl('/login')).toBe(DEFAULT_SLUSH_LOGIN_URL)
    expect(getSlushLoginUrl('slush/login')).toBe(DEFAULT_SLUSH_LOGIN_URL)
  })

  it('falls back to default for non-http protocols', () => {
    silenceWarn()
    expect(getSlushLoginUrl('ftp://slush.example.com/login')).toBe(DEFAULT_SLUSH_LOGIN_URL)
    expect(getSlushLoginUrl('javascript:alert(1)')).toBe(DEFAULT_SLUSH_LOGIN_URL)
  })

  it('falls back to default for garbage', () => {
    silenceWarn()
    expect(getSlushLoginUrl('not a url')).toBe(DEFAULT_SLUSH_LOGIN_URL)
    expect(getSlushLoginUrl(42)).toBe(DEFAULT_SLUSH_LOGIN_URL)
  })
})
