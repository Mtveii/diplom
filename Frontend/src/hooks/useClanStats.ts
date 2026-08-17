import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DonutChartItem } from '@/components/DonutChart'
import { membersApi } from '@/services/api/members.api'
import type { ClanMemberDto } from '@/types/member'

export const RANK_COLORS: Record<string, string> = {
  Leader: '#a78bfa',
  Officer: '#38bdf8',
  Member: '#2dd4bf',
  Recruit: '#94a3b8',
}

export const STATUS_COLORS: Record<string, string> = {
  Active: '#34d399',
  Pending: '#fbbf24',
  Muted: '#f59e0b',
  Banned: '#fb7185',
}

export interface ClanCounts {
  total: number
  online: number
  inGame: number
  restricted: number
}

export function useClanStats() {
  const [members, setMembers] = useState<ClanMemberDto[]>([])
  const [loading, setLoading] = useState(true)

  const reduceBy = useCallback(
    (key: (member: ClanMemberDto) => string) =>
      members.reduce<Record<string, number>>((acc, member) => {
        const value = key(member)
        acc[value] = (acc[value] ?? 0) + 1
        return acc
      }, {}),
    [members],
  )

  const counts = useMemo<ClanCounts>(() => {
    return {
      total: members.length,
      online: members.filter((m) => m.isOnline).length,
      inGame: members.filter((m) => m.isOnline && m.currentGameName).length,
      restricted: members.filter((m) => m.status === 'Muted' || m.status === 'Banned').length,
    }
  }, [members])

  const ranks = useMemo<DonutChartItem[]>(() => {
    const byRank = reduceBy((m) => m.internalRank)
    return (['Leader', 'Officer', 'Member', 'Recruit'] as const)
      .map((rank) => ({ name: rank, value: byRank[rank] ?? 0, color: RANK_COLORS[rank] }))
      .filter((item) => item.value > 0)
  }, [reduceBy])

  const statuses = useMemo<DonutChartItem[]>(() => {
    const byStatus = reduceBy((m) => m.status)
    return (['Active', 'Pending', 'Muted', 'Banned'] as const)
      .map((status) => ({ name: status, value: byStatus[status] ?? 0, color: STATUS_COLORS[status] }))
      .filter((item) => item.value > 0)
  }, [reduceBy])

  const topGames = useMemo(() => {
    const byGame = reduceBy((m) => m.currentGameName ?? '')
    return Object.entries(byGame)
      .filter(([name]) => name !== '')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  }, [reduceBy])

  const reload = useCallback(async () => {
    try {
      const data = await membersApi.getAll()
      setMembers(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { counts, ranks, statuses, topGames, loading, reload }
}