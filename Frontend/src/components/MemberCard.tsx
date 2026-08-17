import type { ClanMemberDto, InternalRank, MemberStatus } from '@/types/member'

interface MemberCardProps {
  member: ClanMemberDto
  onOpen: (member: ClanMemberDto) => void
}

const rankBadge: Record<InternalRank, string> = {
  Leader: 'bg-rose-500/20 text-rose-300',
  Officer: 'bg-amber-500/20 text-amber-300',
  Member: 'bg-sky-500/20 text-sky-300',
  Recruit: 'bg-slate-500/20 text-slate-300',
}

const statusLabel: Record<MemberStatus, string> = {
  Pending: 'Ожидает',
  Active: 'Активен',
  Muted: 'Мут',
  Banned: 'Бан',
}

export default function MemberCard({ member, onOpen }: MemberCardProps) {
  const hours = Math.round(member.minutesPlayedTotal / 60)

  return (
    <button
      onClick={() => onOpen(member)}
      className="card card-hover card-hud card-hud--sm group flex w-full items-center gap-4 p-4 text-left"
    >
      <div className="relative">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={member.username} className="h-12 w-12 rounded-full border border-surface-700" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
            {member.username.charAt(0).toUpperCase()}
          </div>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-900 ${
            member.isOnline ? 'animate-pulse-dot bg-success-400' : 'bg-slate-600'
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-slate-100">{member.username}</span>
          <span className={`badge ${rankBadge[member.internalRank]}`}>{member.internalRank}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-400">
          {member.isOnline
            ? member.currentGameName ?? 'В сети'
            : `Был: ${member.lastSeenAt ? new Date(member.lastSeenAt).toLocaleString('ru-RU') : 'неизвестно'}`}
        </div>
      </div>

      <div className="shrink-0 text-right text-xs">
        <div className="font-semibold tabular-nums text-slate-200">{hours} ч</div>
        <div className={member.status === 'Active' ? 'text-success-400' : 'text-warning-400'}>
          {statusLabel[member.status]}
        </div>
      </div>
    </button>
  )
}