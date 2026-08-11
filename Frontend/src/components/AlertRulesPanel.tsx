import { useCallback, useEffect, useState } from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import { alertsApi } from '@/services/api/alerts.api'
import { notificationsApi } from '@/services/api/notifications.api'
import { toast } from '@/store/toastStore'
import type { AlertCondition, AlertRuleDto, AlertRuleType } from '@/types/alert'
import type { NotificationChannel } from '@/types/notification'

const ruleTypes: AlertRuleType[] = ['NoLoginFor', 'ReviewDrop', 'DiscountStarted', 'NewsRelease']
const conditions: AlertCondition[] = ['LessThan', 'GreaterThan', 'Equals']

const CHANNELS: NotificationChannel[] = ['Telegram', 'Discord', 'Email', 'InApp']

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  Telegram: 'Telegram',
  Discord: 'Discord',
  Email: 'Email',
  InApp: 'InApp',
}

const RULE_LABELS: Record<AlertRuleType, string> = {
  NoLoginFor: 'Не заходил',
  ReviewDrop: 'Отзывы упали',
  DiscountStarted: 'Скидка началась',
  NewsRelease: 'Новая новость',
}

const CONDITION_LABELS: Record<AlertCondition, string> = {
  LessThan: 'ниже',
  GreaterThan: 'выше',
  Equals: 'равно',
}

interface AlertRulesPanelProps {
  selectedAppId?: number
}

export default function AlertRulesPanel({ selectedAppId }: AlertRulesPanelProps) {
  const [rules, setRules] = useState<AlertRuleDto[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<AlertRuleType>('ReviewDrop')
  const [targetId, setTargetId] = useState('')
  const [condition, setCondition] = useState<AlertCondition>('LessThan')
  const [threshold, setThreshold] = useState('')
  const [channels, setChannels] = useState<Set<NotificationChannel>>(new Set(['InApp']))
  const [deleteRule, setDeleteRule] = useState<AlertRuleDto | null>(null)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    setRules(await alertsApi.getRules())
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    notificationsApi
      .getChannels()
      .then((settings) => setChannels(new Set(settings.filter((s) => s.isEnabled).map((s) => s.channel))))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (selectedAppId) {
      setTargetId(String(selectedAppId))
    }
  }, [selectedAppId])

  const toggleChannel = async (channel: NotificationChannel, enabled: boolean) => {
    setChannels((prev) => {
      const next = new Set(prev)
      if (enabled) {
        next.add(channel)
      } else {
        next.delete(channel)
      }
      return next
    })
    try {
      await notificationsApi.updateChannel(channel, enabled, null)
    } catch (err) {
      toast.error('Не удалось обновить канал', err instanceof Error ? err.message : undefined)
    }
  }

  const handleCreate = async () => {
    if (!threshold && type !== 'NewsRelease') {
      toast.warning('Укажите пороговое значение')
      return
    }
    setSaving(true)
    try {
      await alertsApi.createRule({
        name: name.trim() || RULE_LABELS[type],
        type,
        targetId: targetId || null,
        condition,
        thresholdValue: Number(threshold) || 0,
        isActive: true,
      })
      setName('')
      setThreshold('')
      await reload()
      toast.success('Правило алерта создано', RULE_LABELS[type])
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (rule: AlertRuleDto) => {
    try {
      await alertsApi.toggleRule(rule.id, !rule.isActive)
      await reload()
      toast.success(rule.isActive ? 'Правило выключено' : 'Правило включено', rule.name)
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    }
  }

  const handleDelete = async () => {
    if (!deleteRule) {
      return
    }
    setSaving(true)
    try {
      await alertsApi.deleteRule(deleteRule.id)
      toast.success('Правило удалено', deleteRule.name)
      setDeleteRule(null)
      await reload()
    } catch (err) {
      toast.error('Ошибка', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const handleEvaluate = async () => {
    try {
      await alertsApi.evaluate()
      await reload()
      toast.success('Правила оценены', 'Алерты обработаны')
    } catch (err) {
      toast.error('Ошибка оценки', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <section className="card flex flex-col gap-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white">Alert Rule Builder</h3>
        <button
          onClick={() => void handleEvaluate()}
          className="btn-ghost bg-warning-500/10 px-3 py-1.5 text-xs text-warning-400 hover:bg-warning-500/20"
        >
          Оценить сейчас
        </button>
      </div>

      <div className="rounded-xl border border-surface-700/60 bg-surface-950/40 p-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">When</span>
            <select value={type} onChange={(event) => setType(event.target.value as AlertRuleType)} className="input h-10 bg-surface-950">
              {ruleTypes.map((t) => (
                <option key={t} value={t}>
                  {RULE_LABELS[t]}
                </option>
              ))}
            </select>
            <span className="font-semibold uppercase tracking-wider text-slate-500">Is</span>
            <select value={condition} onChange={(event) => setCondition(event.target.value as AlertCondition)} className="input h-10 bg-surface-950">
              {conditions.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
            {type !== 'NewsRelease' && (
              <>
                <span className="font-semibold uppercase tracking-wider text-slate-500">Value</span>
                <input
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                  placeholder={type === 'NoLoginFor' ? 'дней' : type === 'ReviewDrop' ? '%' : '$'}
                  type="number"
                  className="input h-10 w-28"
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Target</span>
            <input
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              placeholder="AppId (пусто = глобально)"
              className="input h-10 w-56"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Then</span>
            <span className="text-slate-300">Send notification via</span>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((channel) => {
                const enabled = channels.has(channel)
                return (
                  <button
                    key={channel}
                    onClick={() => void toggleChannel(channel, !enabled)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                      enabled
                        ? 'border-primary-500/50 bg-primary-500/10 text-primary-300'
                        : 'border-surface-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-primary-400' : 'bg-slate-600'}`} />
                    {CHANNEL_LABELS[channel]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-surface-800 pt-3">
            <div className="flex-1">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Название правила (необязательно)"
                className="input h-10 w-full"
              />
            </div>
            <button onClick={() => void handleCreate()} disabled={saving} className="btn-primary h-10">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Save rule
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Активные правила</h4>
        {rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
            Правил пока нет — создайте выше
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-950/60 px-3 py-2 text-sm transition-colors hover:border-surface-700"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${rule.isActive ? 'animate-pulse-dot bg-success-400' : 'bg-slate-600'}`}
                title={rule.isActive ? 'активно' : 'выключено'}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-100">{rule.name}</div>
                <div className="text-xs text-slate-500">
                  {RULE_LABELS[rule.type]} · {rule.targetId ? `App ${rule.targetId}` : 'глобально'} ·{' '}
                  {CONDITION_LABELS[rule.condition]} {rule.thresholdValue}
                </div>
              </div>
              <button
                onClick={() => void handleToggle(rule)}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                  rule.isActive
                    ? 'border border-surface-700 text-slate-300 hover:bg-surface-800'
                    : 'border border-success-600/50 bg-success-500/10 text-success-400 hover:bg-success-500/20'
                }`}
              >
                {rule.isActive ? 'Выключить' : 'Включить'}
              </button>
              <button
                onClick={() => setDeleteRule(rule)}
                className="rounded-lg border border-rose-800/60 px-2.5 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-950/50"
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={deleteRule !== null}
        title="Удалить правило?"
        description={deleteRule ? `${deleteRule.name} — это действие нельзя отменить.` : ''}
        confirmLabel="Удалить"
        loading={saving}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteRule(null)}
      />
    </section>
  )
}
