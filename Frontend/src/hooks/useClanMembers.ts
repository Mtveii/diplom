import { useCallback, useEffect, useState } from 'react'
import type { InternalRank, MemberStatus } from '@/types/member'
import { membersApi } from '@/services/api/members.api'

export function useClanMembers() {
  const [members, setMembers] = useState<Awaited<ReturnType<typeof membersApi.getAll>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<MemberStatus | undefined>(undefined)
  const [rank, setRank] = useState<InternalRank | undefined>(undefined)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await membersApi.getAll({
        search: search || undefined,
        status,
        rank,
      })
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки участников')
    } finally {
      setLoading(false)
    }
  }, [search, status, rank])

  useEffect(() => {
    void reload()
  }, [reload])

  return { members, loading, error, search, setSearch, status, setStatus, rank, setRank, reload }
}