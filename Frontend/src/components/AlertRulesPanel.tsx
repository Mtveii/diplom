import { useCallback, useEffect, useState } from 'react'
import { alertsApi } from '@/services/api/alerts.api'
import { notificationsApi } from '@/services/api/notifications.api'
import { useLocale } from '@/hooks/useLocale'
import { toast } from '@/store/toastStore'
import type { AlertCondition, AlertRuleDto, AlertRuleType } from '@/types/alert'
import type { NotificationChannel } from '@/types/notification'

/** Типы правил — 1-в-1 Slush.Domain.Enums.RuleType (строки, не id). */
const ruleTypes: AlertRuleType[] = ['ClanOnlineDrop', 'PlayerOffline', 'DiscountAppeared']
const conditions: AlertCondition[] = ['LessThan', 'GreaterThan', 'Equals']

const CHANNELS: NotificationChannel[] = ['Telegram', 'Discord', 'Email', 'Web']

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  Telegram: 'Telegram',
  Discord: 'Discord',
  Email: 'Email',
  Web: 'Web',
}

interface AlertRulesPanelProps {
  selectedAppId?: string | number
}

export default function AlertRulesPanel({ selectedAppId }: AlertRulesPanelProps) {
  const { t } = useLocale()
  const ruleLabels: Record<AlertRuleType, string> = {
    ClanOnlineDrop: t.alerts.ruleClanDrop,
    PlayerOffline: t.alerts.rulePlayerOffline,
    DiscountAppeared: t.alerts.ruleDiscountAppeared,
  }
  const conditionLabels: Record<AlertCondition, string> = {
    LessThan: t.alerts.condBelow,
    GreaterThan: t.alerts.condAbove,
    Equals: t.alerts.condEquals,
  }
  const [rules, setRules] = useState<AlertRuleDto[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<AlertRuleType>('ClanOnlineDrop')
  const [targetId, setTargetId] = useState('')
  const [condition, setCondition] = useState<AlertCondition>('LessThan')
  const [threshold, setThreshold] = useState('')
  const [channels, setChannels] = useState<Set<NotificationChannel>>(new Set())
  const [channelConfigs, setChannelConfigs] = useState<Record<string, string | null>>({})
  const [ruleChannel, setRuleChannel] = useState<NotificationChannel>('Telegram')
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
      .then((settings) => {
        setChannels(new Set(settings.filter((s) => s.isEnabled).map((s) => s.channel)))
        setChannelConfigs(Object.fromEntries(settings.map((s) => [s.channel, s.configJson])))
      })
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
      // Конфиг пересылаем как есть: иначе PUT с null затёр бы вебхук/токен канала.
      await notificationsApi.updateChannel(channel, enabled, channelConfigs[channel] ?? null)
    } catch (err) {
      toast.error(t.alerts.channelError, err instanceof Error ? err.message : undefined)
    }
  }

  const handleCreate = async () => {
    if (!threshold) {
      toast.warning(t.alerts.needThreshold)
      return
    }
    setSaving(true)
    try {
      await alertsApi.createRule({
        name: name.trim() || ruleLabels[type],
        type,
        targetId: targetId || null,
        condition,
        thresholdValue: Number(threshold) || 0,
        channel: ruleChannel,
        isActive: true,
      })
      setName('')
      setThreshold('')
      await reload()
      toast.success(t.alerts.created, ruleLabels[type])
    } catch (err) {
      toast.error(t.alerts.error, err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card card-hud flex flex-col gap-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white">{t.alerts.builder}</h3>
      </div>

      <div className="card-hud card-hud--sm rounded-xl border border-primary-500/30 bg-surface-950/40 p-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">{t.alerts.when}</span>
            <select value={type} onChange={(event) => setType(event.target.value as AlertRuleType)} className="input h-10 bg-surface-950">
              {ruleTypes.map((ruleType) => (
                <option key={ruleType} value={ruleType}>
                  {ruleLabels[ruleType]}
                </option>
              ))}
            </select>
            <span className="font-semibold uppercase tracking-wider text-slate-500">{t.alerts.is}</span>
            <select value={condition} onChange={(event) => setCondition(event.target.value as AlertCondition)} className="input h-10 bg-surface-950">
              {conditions.map((c) => (
                <option key={c} value={c}>
                  {conditionLabels[c]}
                </option>
              ))}
            </select>
            <span className="font-semibold uppercase tracking-wider text-slate-500">{t.alerts.value}</span>
            <input
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              placeholder={type === 'PlayerOffline' ? t.alerts.thresholdDays : type === 'DiscountAppeared' ? '$' : ''}
              type="number"
              className="input h-10 w-28"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">{t.alerts.target}</span>
            <input
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              placeholder={t.alerts.targetPlaceholder}
              className="input h-10 w-56"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">{t.alerts.then}</span>
            <span className="text-slate-300">{t.alerts.sendVia}</span>
            <select
              value={ruleChannel}
              onChange={(event) => setRuleChannel(event.target.value as NotificationChannel)}
              className="input h-10 bg-surface-950"
              title={t.alerts.then}
            >
              {CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
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
                    <span className={`channel-dot ${enabled ? 'channel-dot--active' : ''}`} />
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
                placeholder={t.alerts.namePlaceholder}
                className="input h-10 w-full"
              />
            </div>
            <button onClick={() => void handleCreate()} disabled={saving} className="btn-primary h-10">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t.alerts.saveRule}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.alerts.activeRules}</h4>
        {rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-700 px-4 py-8 text-center text-sm text-slate-500">
            {t.alerts.emptyRules}
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="card-hud card-hud--sm card-hud--reveal flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-950/60 px-3 py-2 text-sm transition-colors hover:border-surface-700"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${rule.isActive ? 'animate-pulse-dot bg-success-400' : 'bg-slate-600'}`}
                title={rule.isActive ? t.alerts.activeTitle : t.alerts.disabledTitle}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-100">{rule.name}</div>
                <div className="text-xs text-slate-500">
                  {ruleLabels[rule.type as AlertRuleType] ?? t.alerts.typeFallback(rule.type)} · {rule.targetId ? `App ${rule.targetId}` : t.alerts.globalTarget} ·{' '}
                  {conditionLabels[rule.condition as AlertCondition] ?? rule.condition} {rule.thresholdValue}
                  {rule.channel ? ` · ${CHANNEL_LABELS[rule.channel as NotificationChannel] ?? rule.channel}` : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
