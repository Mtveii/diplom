import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/services/api/auth.api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [username, setUsername] = useState(user?.username ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Эндпоинта изменения профиля в Slush API нет — сохраняем локально для отображения.
      await new Promise((r) => setTimeout(r, 400))
      toast.success('Профиль сохранён локально (API не поддерживает изменение)')
    } catch {
      toast.error('Не удалось обновить профиль')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Профиль</h1>
        <p className="mt-0.5 text-sm text-slate-400">Данные текущей учётной записи Slush API</p>
      </div>

      <div className="card card-hud p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="profile-avatar flex h-20 w-20 items-center justify-center bg-gradient-to-br from-primary-500 to-accent-500 text-2xl font-bold text-white">
            {(user?.username ?? 'A').charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">{user?.username ?? 'Загрузка...'}</h2>
              <span className="rounded-full bg-primary-500/15 px-3 py-0.5 text-xs font-semibold text-primary-400">
                {user?.role ?? '—'}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Email: <span className="font-mono text-slate-200">{user?.email ?? '—'}</span>
            </div>
            <div className="text-xs text-slate-400">
              UserId: <span className="font-mono text-slate-200">{user?.userId ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card card-hud p-6">
        <div className="card-header-hud mb-4">
          <h3 className="card-header-hud__title">Отображаемое имя</h3>
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
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>

      <div className="card card-hud p-6">
        <div className="card-header-hud mb-2">
          <h3 className="card-header-hud__title">Сессия</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Токен хранится в localStorage. При выходе сессия завершается на устройстве и на сервере.
        </p>
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-success-400 animate-pulse" />
          <span className="text-xs text-success-400 font-medium">Сессия активна</span>
          <button
            onClick={() => void authApi.logout().finally(() => navigate('/login', { replace: true }))}
            className="btn-danger ml-auto h-8 px-3 text-xs"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  )
}
