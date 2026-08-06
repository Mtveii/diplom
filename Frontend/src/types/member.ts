export type InternalRank = 'Recruit' | 'Member' | 'Officer' | 'Leader'

export type MemberStatus = 'Pending' | 'Active' | 'Muted' | 'Banned'

export type WarningSeverity = 'Low' | 'Medium' | 'High'

export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected'

export interface ClanMemberDto {
  id: number
  steamId64: string
  username: string
  avatarUrl: string
  isOnline: boolean
  currentGameId: number | null
  currentGameName: string | null
  internalRank: InternalRank
  status: MemberStatus
  joinedAt: string
  minutesPlayedTotal: number
  lastSeenAt: string | null
}

export interface MemberWarningDto {
  id: number
  memberId: number
  issuedByUserId: number | null
  issuedByUsername: string | null
  reason: string
  severity: WarningSeverity
  issuedAt: string
  expiresAt: string | null
  isActive: boolean
}

export interface MembershipApplicationDto {
  id: number
  steamId64: string
  username: string | null
  avatarUrl: string | null
  status: ApplicationStatus
  reviewedByUserId: number | null
  comment: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface MemberProfileHistoryDto {
  id: number
  memberId: number
  field: string
  oldValue: string | null
  newValue: string | null
  changedAt: string
}