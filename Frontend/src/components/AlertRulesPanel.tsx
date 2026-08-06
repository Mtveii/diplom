import { useCallback, useEffect, useState } from 'react'
import { alertsApi } from '@/services/api/alerts.api'
import type { AlertCondition, AlertRuleDto, AlertRuleType } from '@/types/alert'

const ruleTypes: AlertRuleType[] = ['NoLoginFor', 'ReviewDrop', 'DiscountStarted', 'NewsRelease']
const conditions: AlertCondition[] = ['GreaterThan', 'LessThan', 'Equals']

interface AlertRulesPanelProps {
  selectedAppId?: number
}

export default function AlertRulesPanel({ selectedAppId }: AlertRulesPanelProps) {
  const [rules, setRules] = useState<AlertRuleDto[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<AlertRuleType>('ReviewDrop')
  const [targetId, setTargetId] = useState('')
  const [condition, setCondition] = useState<AlertCondition>('GreaterThan')
  const [threshold, setThreshold] = useState('')

  const reload = useCallback(async () => {
    setRules(await alertsApi.getRules())
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (selectedAppId) {
      setTargetId(String(selectedAppId))
    }
  }, [selectedAppId])

  const handleCreate = async () => {
    await alertsApi.createRule({
      name: name || type,
      type,
      targetId: targetId || null,
      condition,
      thresholdValue: Number(threshold) || 0,
      isActive: true,
    })
    setName('')
    setThreshold('')
    await reload()
  }

  const handleToggle = async (rule: AlertRuleDto) => {
    await alertsApi.toggleRule(rule.id, !rule.isActive)
    await reload()
  }

  const handleDelete = async (id: number) => {
    await alertsApi.deleteRule(id)
    await reload()
  }

  const handleEvaluate = async () => {
    await alertsApi.evaluate()
    await reload()
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">Правила алертов</h3>
        <button
          onClick={() => void handleEvaluate()}
          className="btn-ghost bg-warning-500/10 px-3 py-1.5 text-xs text-warning-400 hover:bg-warning-500/20"
        >
          Оценить сейчас
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Название"
          className="input lg:col-span-2"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value as AlertRuleType)}
          className="input bg-surface-950"
        >
          {ruleTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          placeholder="TargetId (SteamId64/AppId)"
          className="input"
        />
        <select
          value={condition}
          onChange={(event) => setCondition(event.target.value as AlertCondition)}
          className="input bg-surface-950"
        >
          {conditions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="Порог"
            type="number"
            className="input flex-1"
          />
          <button
            onClick={() => void handleCreate()}
            title="Создать правило"
            className="btn-primary px-3 py-1.5"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
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
                  {rule.type} · {rule.targetId ?? 'глобально'} · {rule.condition} {'>'} {rule.thresholdValue}
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
                onClick={() => void handleDelete(rule.id)}
                className="rounded-lg border border-rose-800/60 px-2.5 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-950/50"
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}