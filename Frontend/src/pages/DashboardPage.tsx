import { Link } from 'react-router-dom'
import Chart from '@/components/Chart'
import HeatmapChart from '@/components/HeatmapChart'
import Spinner from '@/components/Spinner'
import StatCard from '@/components/StatCard'
import { useDashboard } from '@/hooks/useDashboard'
import { useMonitoringCharts } from '@/hooks/useMonitoringCharts'

const medalColors = ['text-warning-400', 'text-slate-300', 'text-amber-700']

const avatarColors = [
  'from-primary-500 to-accent-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-orange-500',
  'from-sky-500 to-indigo-500',
  'from-fuchsia-500 to-purple-500',
]

const quickActions = [
  {
    to: '/members',
    title: 'Управление участниками',
    description: 'Статусы, роли, профили Steam',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: 'text-primary-400',
    bg: 'from-primary-500/20 to-primary-500/5',
  },
  {
    to: '/applications',
    title: 'Заявки на вступление',
    description: 'Одобрение и отклонение заявок',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
    ),
    color: 'text-success-400',
    bg: 'from-success-500/20 to-success-500/5',
  },
  {
    to: '/games',
    title: 'Мониторинг игр и алерты',
    description: 'Онлайн, алерты, каталог игр',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12h4" />
        <path d="M14 12h.01" />
        <path d="M17 12h.01" />
        <path d="M6 16h4" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    ),
    color: 'text-accent-400',
    bg: 'from-accent-500/20 to-accent-500/5',
  },
  {
    to: '/analytics',
    title: 'Аналитика и отчёты',
    description: 'Retention, отток, когорты',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M7 13l4-4 4 4 5-5" />
      </svg>
    ),
    color: 'text-warning-400',
    bg: 'from-warning-500/20 to-warning-500/5',
  },
]

function ProgressRing({
  percent,
  label,
  color,
}: {
  percent: number
  label: string
  color: string
}) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#16404f" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          {Math.round(percent)}%
        </div>
      </div>
      <div className="whitespace-pre-line text-center text-[11px] leading-tight text-slate-400">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const { summary, loading } = useDashboard()
  const { activity, heatmap, topPlayers, period, setPeriod, loading: chartsLoading } = useMonitoringCharts()

  if (loading || chartsLoading) {
    return <Spinner label="Загрузка данных клана..." fullPage />
  }

  const onlinePercent = summary && summary.totalMembers > 0 ? (summary.onlineNow / summary.totalMembers) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">Дашборд клана</h1>
        <p className="mt-1 text-sm text-slate-400">Сводка активности Steam-клана в реальном времени</p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <StatCard
          label="Всего участников"
          value={summary?.totalMembers ?? 0}
          accent="slate"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Онлайн сейчас"
          value={summary?.onlineNow ?? 0}
          accent="green"
          hint="пульс клана в данный момент"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
          }
        />
        <StatCard
          label="Игроков сегодня"
          value={summary?.playersToday ?? 0}
          accent="blue"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 12h.01" />
              <path d="M10 12h.01" />
            </svg>
          }
        />
        <StatCard
          label="Активность за неделю"
          value={summary?.activeThisWeek ?? 0}
          accent="blue"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v16a2 2 0 0 0 2 2h16" />
              <path d="M7 13l4-4 4 4 5-5" />
            </svg>
          }
        />
        <StatCard
          label="Заявки на рассмотрении"
          value={summary?.pendingApplications ?? 0}
          accent="amber"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />
        <StatCard
          label="Активных алертов"
          value={summary?.activeAlerts ?? 0}
          accent="red"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Активность клана</h2>
          <p className="text-xs text-slate-500">Онлайн и занятость по времени суток</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-surface-700 bg-surface-900 p-1">
          {(['day', 'week', 'month'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                period === value
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow'
                  : 'text-slate-400 hover:bg-surface-800'
              }`}
            >
              {value === 'day' ? 'День' : value === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Chart
          label="Онлайн по часам"
          data={activity.map((point) => ({ timestamp: point.timestamp, value: point.onlineCount }))}
        />
        <HeatmapChart data={heatmap} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Загрузка клана</h3>
          <div className="flex justify-around">
            <ProgressRing percent={onlinePercent} label="участников\nонлайн сейчас" color="#34d399" />
            <ProgressRing
              percent={summary && summary.totalMembers > 0 ? ((summary.activeThisWeek ?? 0) / summary.totalMembers) * 100 : 0}
              label="активность\nза неделю"
              color="#2dd4bf"
            />
            <ProgressRing
              percent={summary && summary.totalMembers > 0 ? ((summary.playersToday ?? 0) / summary.totalMembers) * 100 : 0}
              label="играли\nсегодня"
              color="#f59e0b"
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Топ игроков по playtime</h3>
            <span className="badge border border-surface-700 bg-surface-800/60 text-slate-300">за период</span>
          </div>
          <div className="flex flex-col gap-1">
            {topPlayers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
                Нет данных за период — джоба сбора playtime ещё не отработала
              </div>
            ) : (
              topPlayers.map((player, index) => (
                <div
                  key={player.steamId64}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-800/60"
                >
                  <span className={`w-6 text-sm font-bold ${medalColors[index] ?? 'text-slate-500'}`}>
                    {index + 1}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                      avatarColors[index % avatarColors.length]
                    } text-[11px] font-bold text-white`}
                  >
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-sm">{player.username}</span>
                  <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
                    <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {player.hoursPlayed.toFixed(1)} ч
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Быстрые действия</h3>
          <div className="flex flex-col gap-2.5">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-800/40 p-3 transition-all hover:-translate-y-0.5 hover:border-surface-750"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.bg} ${action.color}`}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100">{action.title}</div>
                  <div className="truncate text-xs text-slate-500">{action.description}</div>
                </div>
                <svg
                  className="ml-auto h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
