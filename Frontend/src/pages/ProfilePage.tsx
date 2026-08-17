import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const [username, setUsername] = useState(user?.username ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Имитация сохранения профиля
      await new Promise((r) => setTimeout(r, 600))
      toast.success('Профиль успешно обновлён')
    } catch {
      toast.error('Не удалось обновить профиль')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Профиль администратора</h1>
        <p className="mt-0.5 text-sm text-slate-400">Управление учетной записью и настройками сессии</p>
      </div>

      <div className="card card-hud p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="profile-avatar h-20 w-20 border-2 border-primary-500/50" />
          ) : (
            <div className="profile-avatar flex h-20 w-20 items-center justify-center bg-gradient-to-br from-primary-500 to-accent-500 text-2xl font-bold text-white">
              {user?.username?.charAt(0).toUpperCase() ?? 'A'}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">{user?.username}</h2>
              <span className="rounded-full bg-primary-500/15 px-3 py-0.5 text-xs font-semibold text-primary-400">
                {user?.role}
              </span>
            </div>
            <div className="text-xs text-slate-400">SteamID64: <span className="font-mono text-slate-200">{user?.steamId64}</span></div>
            {user?.steamId64 && (
              <a
                href={`https://steamcommunity.com/profiles/${user.steamId64}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:underline pt-1"
              >
                Открыть профиль в Steam
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="card card-hud p-6">
        <div className="card-header-hud mb-4">
          <h3 className="card-header-hud__title">Основные данные</h3>
        </div>
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input w-full max-w-md"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Роль в системе</label>
            <input
              type="text"
              value={user?.role ?? ''}
              disabled
              className="input w-full max-w-md opacity-60 cursor-not-allowed"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>

      <div className="card card-hud p-6">
        <div className="card-header-hud mb-2">
          <h3 className="card-header-hud__title">Безопасность сессии</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Сессия защищена JWT-токенами с автоматическим обновлением через HttpOnly Cookies.
        </p>
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-success-400 animate-pulse" />
          <span className="text-xs text-success-400 font-medium">Активная сессия (Secure & HttpOnly)</span>
        </div>
      </div>
    </div>
  )
}
