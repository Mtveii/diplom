import { describe, expect, it } from 'vitest'
import {
  canAccess,
  canBanUser,
  canManageAlerts,
  canManageRoles,
  canViewSecurity,
  decodeIdentityFromToken,
  decodeRoleFromToken,
  extractTokenFromUrl,
  getRoleLevel,
  hasOtherEffectiveSuperAdmin,
  isEffectiveSuperAdmin,
  isKnownRole,
  isSelfIdentity,
  JWT_ROLE_CLAIM,
  type RoleHolder,
} from './role'

function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode(payload)}.sig`
}

describe('decodeRoleFromToken', () => {
  it('returns null for empty or broken tokens', () => {
    expect(decodeRoleFromToken(null)).toBeNull()
    expect(decodeRoleFromToken(undefined)).toBeNull()
    expect(decodeRoleFromToken('')).toBeNull()
    expect(decodeRoleFromToken('not-a-jwt')).toBeNull()
  })

  it('reads the short role claim first', () => {
    const token = fakeJwt({ role: 'Moderator', [JWT_ROLE_CLAIM]: 'Admin' })
    expect(decodeRoleFromToken(token)).toBe('Moderator')
  })

  it('falls back to the long MS identity claim', () => {
    const token = fakeJwt({ [JWT_ROLE_CLAIM]: 'SuperAdmin' })
    expect(decodeRoleFromToken(token)).toBe('SuperAdmin')
  })

  it('supports array role claims', () => {
    const token = fakeJwt({ [JWT_ROLE_CLAIM]: ['Analyst', 'User'] })
    expect(decodeRoleFromToken(token)).toBe('Analyst')
  })

  it('returns null when no role claim exists', () => {
    expect(decodeRoleFromToken(fakeJwt({ sub: '123' }))).toBeNull()
  })
})

describe('isKnownRole', () => {
  it('accepts only the four admin roles', () => {
    expect(isKnownRole('SuperAdmin')).toBe(true)
    expect(isKnownRole('Admin')).toBe(true)
    expect(isKnownRole('Moderator')).toBe(true)
    expect(isKnownRole('Analyst')).toBe(true)
    expect(isKnownRole('User')).toBe(false)
    expect(isKnownRole('Viewer')).toBe(false)
    expect(isKnownRole(null)).toBe(false)
  })
})

describe('canBanUser', () => {
  const sa = { id: 'sa', username: 'boss', role: 'SuperAdmin', isBanned: false }
  const admin = { id: 'a', username: 'adm', role: 'Admin', isBanned: false }
  const mod = { id: 'm', username: 'mod', role: 'Moderator', isBanned: false }
  const selfSa = { userId: 'sa', username: 'boss' }

  it('forbids banning yourself', () => {
    expect(canBanUser('SuperAdmin', sa, selfSa)).toBe(false)
  })

  it('allows SuperAdmin to ban anyone else', () => {
    expect(canBanUser('SuperAdmin', admin, selfSa)).toBe(true)
    expect(canBanUser('SuperAdmin', mod, selfSa)).toBe(true)
  })

  it('forbids non-SuperAdmin from banning Admin/SuperAdmin', () => {
    expect(canBanUser('Admin', admin, null)).toBe(false)
    expect(canBanUser('Moderator', sa, null)).toBe(false)
    expect(canBanUser('Moderator', mod, null)).toBe(true)
  })

  it('matches by username when ids differ', () => {
    expect(isSelfIdentity({ userId: 'x', username: 'mod' }, mod)).toBe(true)
    expect(isSelfIdentity(null, mod)).toBe(false)
  })
})

describe('canAccess', () => {
  it('opens everything for SuperAdmin', () => {
    for (const path of ['/', '/members', '/members/1', '/games', '/games/730', '/analytics', '/command-center', '/settings']) {
      expect(canAccess(path, 'SuperAdmin')).toBe(true)
    }
  })

  it('keeps Analyst away from members, command-center and settings', () => {
    expect(canAccess('/analytics', 'Analyst')).toBe(true)
    expect(canAccess('/games', 'Analyst')).toBe(true)
    expect(canAccess('/members', 'Analyst')).toBe(false)
    expect(canAccess('/command-center', 'Analyst')).toBe(false)
    expect(canAccess('/settings', 'Analyst')).toBe(false)
  })

  it('keeps Moderator away from analytics, command-center and settings', () => {
    expect(canAccess('/members', 'Moderator')).toBe(true)
    expect(canAccess('/analytics', 'Moderator')).toBe(false)
    expect(canAccess('/command-center', 'Moderator')).toBe(false)
    expect(canAccess('/settings', 'Moderator')).toBe(false)
  })

  it('gives Admin every section except none', () => {
    for (const path of ['/members', '/analytics', '/command-center', '/settings', '/games']) {
      expect(canAccess(path, 'Admin')).toBe(true)
    }
  })

  it('denies everything without a token or with an unknown role (no guests)', () => {
    for (const path of ['/', '/members', '/games', '/analytics', '/command-center', '/settings']) {
      expect(canAccess(path, null)).toBe(false)
      expect(canAccess(path, undefined)).toBe(false)
      expect(canAccess(path, 'User')).toBe(false)
      expect(canAccess(path, 'Viewer')).toBe(false)
    }
    expect(canAccess('/unknown-path', 'SuperAdmin')).toBe(false)
  })
})

describe('getRoleLevel', () => {
  it('ranks the four roles 1-4', () => {
    expect(getRoleLevel('Analyst')).toBe(1)
    expect(getRoleLevel('Moderator')).toBe(2)
    expect(getRoleLevel('Admin')).toBe(3)
    expect(getRoleLevel('SuperAdmin')).toBe(4)
  })

  it('returns 0 for unknown roles and anonymous users', () => {
    expect(getRoleLevel('User')).toBe(0)
    expect(getRoleLevel('Viewer')).toBe(0)
    expect(getRoleLevel(null)).toBe(0)
    expect(getRoleLevel(undefined)).toBe(0)
  })
})

describe('decodeIdentityFromToken', () => {
  it('reads sub and unique_name', () => {
    const token = fakeJwt({ sub: 'user-1', unique_name: 'SlushAdmin' })
    expect(decodeIdentityFromToken(token)).toEqual({ userId: 'user-1', username: 'SlushAdmin' })
  })

  it('returns null without sub', () => {
    expect(decodeIdentityFromToken(fakeJwt({ unique_name: 'x' }))).toBeNull()
    expect(decodeIdentityFromToken(null)).toBeNull()
    expect(decodeIdentityFromToken('broken')).toBeNull()
  })
})

describe('extractTokenFromUrl', () => {
  it('reads ?token=', () => {
    expect(extractTokenFromUrl('?token=abc.def.ghi', '')).toBe('abc.def.ghi')
  })

  it('reads #access_token= and #token=', () => {
    expect(extractTokenFromUrl('', '#access_token=AAA')).toBe('AAA')
    expect(extractTokenFromUrl('', '#token=BBB&other=1')).toBe('BBB')
  })

  it('prefers query over fragment', () => {
    expect(extractTokenFromUrl('?token=Q', '#access_token=F')).toBe('Q')
  })

  it('returns null when absent or empty', () => {
    expect(extractTokenFromUrl('', '')).toBeNull()
    expect(extractTokenFromUrl('?token=', '')).toBeNull()
    expect(extractTokenFromUrl('', '#access_token=')).toBeNull()
    expect(extractTokenFromUrl('?a=1', '#b=2')).toBeNull()
  })
})

describe('superadmin singleton', () => {
  const users: RoleHolder[] = [
    { id: 'sa', role: 'SuperAdmin', isBanned: false },
    { id: 'banned-sa', role: 'SuperAdmin', isBanned: true },
    { id: 'mod', role: 'Moderator', isBanned: false },
  ]

  it('counts only active superadmins', () => {
    expect(isEffectiveSuperAdmin(users[0])).toBe(true)
    expect(isEffectiveSuperAdmin(users[1])).toBe(false)
    expect(isEffectiveSuperAdmin(users[2])).toBe(false)
  })

  it('finds another active superadmin', () => {
    expect(hasOtherEffectiveSuperAdmin(users, 'mod')).toBe(true)
    expect(hasOtherEffectiveSuperAdmin(users, 'sa')).toBe(false)
    expect(hasOtherEffectiveSuperAdmin([], 'sa')).toBe(false)
  })
})

describe('action guards', () => {
  it('allows alerts only for SuperAdmin and Admin', () => {
    expect(canManageAlerts('SuperAdmin')).toBe(true)
    expect(canManageAlerts('Admin')).toBe(true)
    expect(canManageAlerts('Moderator')).toBe(false)
    expect(canManageAlerts('Analyst')).toBe(false)
  })

  it('allows role changes only for SuperAdmin', () => {
    expect(canManageRoles('SuperAdmin')).toBe(true)
    expect(canManageRoles('Admin')).toBe(false)
  })

  it('allows security tabs for SuperAdmin and Admin', () => {
    expect(canViewSecurity('SuperAdmin')).toBe(true)
    expect(canViewSecurity('Admin')).toBe(true)
    expect(canViewSecurity('Moderator')).toBe(false)
  })
})
