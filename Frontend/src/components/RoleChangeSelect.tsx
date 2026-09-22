import { useState } from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import { useLocale } from '@/hooks/useLocale'
import { extractErrorMessage } from '@/services/api/httpClient'
import { usersApi } from '@/services/api/users.api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import {
  decodeIdentityFromToken,
  hasOtherEffectiveSuperAdmin,
  isEffectiveSuperAdmin,
  KNOWN_ROLES,
  type RoleHolder,
} from '@/utils/role'
import type { UserRole } from '@/types/auth'

interface RoleChangeSelectProps {
  user: RoleHolder & { username: string }
  users: readonly RoleHolder[]
  onChanged: () => void
}

/**
 * Смена роли пользователя (только SuperAdmin — гейт ставит родитель).
 * SuperAdmin всегда один: второго назначить нельзя, последнего разжаловать нельзя.
 * PUT уходит только после подтверждения. При смене своей роли страница
 * перезагружается: тихий вход выдаст токен уже с новой ролью.
 */
export default function RoleChangeSelect({ user, users, onChanged }: RoleChangeSelectProps) {
  const { t } = useLocale()
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null)
  const [busy, setBusy] = useState(false)
  const known = KNOWN_ROLES.includes(user.role as UserRole)

  const requestChange = (role: UserRole) => {
    if (role === 'SuperAdmin' && !isEffectiveSuperAdmin(user) && hasOtherEffectiveSuperAdmin(users, user.id)) {
      toast.error(t.settings.superAdminExists)
      return
    }
    if (role !== 'SuperAdmin' && isEffectiveSuperAdmin(user) && !hasOtherEffectiveSuperAdmin(users, user.id)) {
      toast.error(t.settings.lastSuperAdmin)
      return
    }
    setPendingRole(role)
  }

  const confirm = async () => {
    if (!pendingRole) {
      return
    }
    setBusy(true)
    try {
      await usersApi.setRole(user.id, pendingRole)
      toast.success(t.settings.roleUpdated)
      const identity = decodeIdentityFromToken(useAuthStore.getState().accessToken)
      const isSelf =
        identity !== null &&
        (identity.userId === user.id || (identity.username !== null && identity.username === user.username))
      setPendingRole(null)
      if (isSelf) {
        window.location.reload()
        return
      }
      onChanged()
    } catch (err) {
      // Бекенд присылает понятные 400/403 (себя менять нельзя и т.п.) — показываем их текст.
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <select
        value={known ? user.role : ''}
        disabled={busy}
        onChange={(event) => requestChange(event.target.value as UserRole)}
        className="input h-8 max-w-32 bg-surface-950 px-2 text-xs disabled:opacity-50"
        title={t.settings.colRole}
      >
        {!known && (
          <option value="" disabled>
            {user.role}
          </option>
        )}
        {KNOWN_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
      <ConfirmModal
        open={pendingRole !== null}
        title={t.settings.confirmRoleTitle}
        description={pendingRole ? `${user.username} → ${pendingRole}. ${t.settings.confirmRoleHint}` : undefined}
        tone="danger"
        loading={busy}
        onConfirm={() => void confirm()}
        onClose={() => setPendingRole(null)}
      />
    </>
  )
}
