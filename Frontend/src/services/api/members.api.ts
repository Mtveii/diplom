import { httpClient } from './httpClient'
import type {
  ClanMemberDto,
  InternalRank,
  MemberProfileHistoryDto,
  MemberStatus,
  MemberWarningDto,
  MembershipApplicationDto,
  WarningSeverity,
} from '@/types/member'

export const membersApi = {
  getAll: (params?: { search?: string; status?: MemberStatus; rank?: InternalRank }) =>
    httpClient.get<ClanMemberDto[]>('/members', { params }).then((r) => r.data),

  getById: (id: number) => httpClient.get<ClanMemberDto>(`/members/${id}`).then((r) => r.data),

  create: (steamId64: string, internalRank: InternalRank) =>
    httpClient.post<ClanMemberDto>('/members', { steamId64, internalRank }).then((r) => r.data),

  updateRank: (id: number, internalRank: InternalRank) =>
    httpClient.put<ClanMemberDto>(`/members/${id}/rank`, { internalRank }).then((r) => r.data),

  setStatus: (id: number, status: MemberStatus) =>
    httpClient.put<ClanMemberDto>(`/members/${id}/status`, { status }).then((r) => r.data),

  remove: (id: number) => httpClient.delete(`/members/${id}`),

  importFromSteamGroup: (groupId: string) =>
    httpClient.post<{ added: number }>('/members/import/steam-group', groupId, {
      headers: { 'Content-Type': 'application/json' },
    }).then((r) => r.data),

  getWarnings: (memberId: number) =>
    httpClient.get<MemberWarningDto[]>(`/members/${memberId}/warnings`).then((r) => r.data),

  issueWarning: (request: {
    memberId: number
    reason: string
    severity: WarningSeverity
    expiresAt?: string
    banForDays?: number
    muteForDays?: number
  }) => httpClient.post<MemberWarningDto>('/members/warnings', request).then((r) => r.data),

  deactivateWarning: (warningId: number) =>
    httpClient.post(`/members/warnings/${warningId}/deactivate`),

  getProfileHistory: (memberId: number) =>
    httpClient.get<MemberProfileHistoryDto[]>(`/members/${memberId}/history`).then((r) => r.data),
}

export const applicationsApi = {
  submit: (steamId64: string) =>
    httpClient.post<MembershipApplicationDto>('/applications', { steamId64 }).then((r) => r.data),

  getAll: () => httpClient.get<MembershipApplicationDto[]>('/applications').then((r) => r.data),

  review: (id: number, decision: 'Approved' | 'Rejected', comment?: string) =>
    httpClient.put<MembershipApplicationDto>(`/applications/${id}/review`, { decision, comment }).then((r) => r.data),
}