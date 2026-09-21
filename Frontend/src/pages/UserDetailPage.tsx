import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Breadcrumbs from '@/components/Breadcrumbs'
import { PageSkeleton } from '@/components/PageState'
import { usersApi } from '@/services/api/users.api'
import { profileApi } from '@/services/api/profile.api'
import { useLocale } from '@/hooks/useLocale'
import { toast } from '@/store/toastStore'
import { formatDateTime } from '@/utils/format'
import type { AdminUserDto } from '@/types/auth'
import type { SteamProfileDto, SteamProfileGameDto } from '@/types/steam'

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useLocale()
  const [user, setUser] = useState<AdminUserDto | null>(null)
  const [profile, setProfile] = useState<SteamProfileDto | null>(null)
  const [profileGames, setProfileGames] = useState<SteamProfileGameDto[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!id) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const all = await usersApi.getUsers()
      setUser(all.find((u) => u.id === id) ?? null)
    } catch (err) {
      console.warn('[UserDetailPage] Не удалось загрузить пользователя', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    let cancelled = false
    if (user == null) {
      return undefined
    }
    void Promise.all([profileApi.getProfile(user.username), profileApi.getGames(user.username)]).then(
      ([profileData, gamesData]) => {
        if (!cancelled) {
          setProfile(profileData)
          setProfileGames(gamesData)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [user])

  const toggleBan = async () => {
    if (!user || busy) {
      return
    }
    setBusy(true)
    try {
      await usersApi.toggleBan(user.id)
      const updated = { ...user, isBanned: !user.isBanned }
      setUser(updated)
      toast.success(t.users.banToast(user.username, user.isBanned))
    } catch {
      toast.error(t.users.banError)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <PageSkeleton variant="lines" count={4} />
  }

  if (!user) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4">
        <Breadcrumbs>{t.userDetail.title}</Breadcrumbs>
        <div className="rounded-xl border border-dashed border-surface-700 px-4 py-12 text-center">
          <div className="text-sm font-medium text-slate-300">{t.userDetail.notFound}</div>
          <div className="mt-1 text-xs text-slate-500">{t.userDetail.notFoundHint}</div>
          <Link to="/members" className="btn-ghost mt-4 inline-flex py-2 text-xs">
            {t.userDetail.back}
          </Link>
        </div>
      </div>
    )
  }

  const fields: Array<{ label: string; value: string }> = [
    { label: t.userDetail.fieldUsername, value: user.username },
    { label: t.userDetail.fieldEmail, value: user.email ?? t.users.emailHidden },
    { label: t.userDetail.fieldRole, value: user.role },
    { label: t.userDetail.fieldRegistered, value: formatDateTime(user.createdAt, locale) },
    { label: t.userDetail.fieldId, value: user.id },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6">
      <Breadcrumbs>{user.username}</Breadcrumbs>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-lg font-bold text-white">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white">{user.username}</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{t.userDetail.title}</p>
          </div>
        </div>
        <Link to="/members" className="btn-ghost h-8 px-3 text-xs">
          {t.userDetail.back}
        </Link>
      </div>

      <div className="card card-hud overflow-hidden">
        <dl>
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between gap-3 border-b border-surface-800/60 px-4 py-3 text-sm last:border-0"
            >
              <dt className="shrink-0 text-xs uppercase tracking-wider text-slate-500">{field.label}</dt>
              <dd className="min-w-0 truncate font-medium text-slate-100">{field.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <dt className="shrink-0 text-xs uppercase tracking-wider text-slate-500">{t.userDetail.fieldStatus}</dt>
            <dd>
              <span
                className={`badge border px-2 py-0.5 text-[11px] ${
                  user.isBanned
                    ? 'border-danger-500/40 bg-danger-500/10 text-danger-400'
                    : 'border-success-500/40 bg-success-500/10 text-success-400'
                }`}
              >
                {user.isBanned ? t.users.banned : t.users.active}
              </span>
            </dd>
          </div>
        </dl>
        <div className="border-t border-surface-700/60 px-4 py-3 text-right">
          <button
            onClick={() => void toggleBan()}
            disabled={busy}
            className={user.isBanned ? 'btn-ghost h-8 px-3 text-xs' : 'btn-danger h-8 px-3 text-xs'}
          >
            {busy ? '...' : user.isBanned ? t.users.unban : t.users.ban}
          </button>
        </div>
      </div>

      {profile && (
        <div className="card card-hud overflow-hidden">
          <div className="card-header-hud px-4 pt-4">
            <h3 className="card-header-hud__title">{t.userDetail.steamProfile}</h3>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.username ?? user.username} className="h-12 w-12 shrink-0 rounded-xl border border-surface-700/60 object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-lg font-bold text-white">
                {(profile.username ?? user.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-slate-100">{profile.username ?? user.username}</div>
              <div className="text-xs text-slate-500">
                {t.userDetail.level}: {profile.level ?? '—'}
                {profile.status ? ` · ${profile.status}` : ''}
              </div>
            </div>
          </div>
          {profile.bio && <p className="whitespace-pre-line px-4 pb-3 text-xs leading-relaxed text-slate-400">{profile.bio}</p>}
          {profile.badges.length > 0 && (
            <div className="border-t border-surface-700/60 px-4 py-3">
              <div className="mb-2 text-xs font-medium text-slate-400">{t.userDetail.badges}</div>
              <div className="flex flex-wrap gap-2">
                {profile.badges.map((badge, index) => (
                  <span
                    key={badge.id ?? `${badge.title ?? 'badge'}-${index}`}
                    title={badge.description ?? badge.title ?? ''}
                    className="badge border border-surface-700 bg-surface-800 text-slate-300"
                  >
                    {badge.title ?? t.common.untitled}
                    {badge.points != null ? ` · ${badge.points}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profileGames.length > 0 && (
            <div className="border-t border-surface-700/60 px-4 py-3">
              <div className="mb-2 text-xs font-medium text-slate-400">{t.userDetail.games}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {profileGames.map((game) => (
                  <div key={game.id ?? game.title} className="overflow-hidden rounded-xl border border-surface-700/60 bg-surface-900/60">
                    {game.imageUrl && (
                      <img src={game.imageUrl} alt={game.title ?? ''} loading="lazy" className="aspect-video w-full object-cover" />
                    )}
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                      <span className="min-w-0 truncate text-slate-200">{game.title ?? t.common.untitled}</span>
                      <span className="shrink-0 font-semibold text-white">
                        {game.price > 0 ? `$${game.price.toFixed(2)}` : t.common.free}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
