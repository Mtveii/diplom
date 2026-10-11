import { httpClient } from './httpClient'
import { getLocaleDictionary } from '@/store/localeStore'
import type { AlertHistoryDto, AlertRuleDto } from '@/types/alert'
import type { NotificationChannel } from '@/types/notification'

/**
 * Enum'ы Slush API — СТРОКИ (JsonStringEnumConverter, backend SlushBackend):
 * RuleType { ClanOnlineDrop, PlayerOffline, DiscountAppeared },
 * ConditionType { LessThan, GreaterThan, Equals },
 * NotificationChannel { Telegram, Discord, Email, Web }.
 * Числа принимаем терпимо (порядок backend) — на случай старых данных.
 */
export const ALERT_RULE_TYPES = ['ClanOnlineDrop', 'PlayerOffline', 'DiscountAppeared'] as const
export const ALERT_CONDITIONS = ['LessThan', 'GreaterThan', 'Equals'] as const
export const ALERT_CHANNELS = ['Telegram', 'Discord', 'Email', 'Web'] as const

function asEnumName(value: string | number | null, order: readonly string[]): string {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return order[value] ?? String(value)
  }
  return ''
}

/** Сырые формы Slush API. */
interface SlushAlertHistoryDto {
  id: string
  ruleName: string | null
  timestamp: string
  message: string | null
  isRead: boolean
}

interface SlushPagedResultDto<T> {
  items: T[] | null
  totalCount: number
  page: number
  pageSize: number
}

interface SlushAlertRuleDto {
  id: string
  ruleName: string | null
  ruleType: string | number | null
  condition: string | number | null
  threshold: number
  channel: string | number | null
  isEnabled: boolean
}

function mapHistoryItem(item: SlushAlertHistoryDto): AlertHistoryDto {
  return {
    id: item.id,
    ruleId: null,
    ruleName: item.ruleName ?? getLocaleDictionary().common.noRule,
    triggeredAt: item.timestamp,
    message: item.message ?? '',
    isRead: item.isRead,
  }
}

export function mapRule(rule: SlushAlertRuleDto): AlertRuleDto {
  const channel = asEnumName(rule.channel, ALERT_CHANNELS)
  return {
    id: rule.id,
    name: rule.ruleName ?? getLocaleDictionary().common.untitled,
    type: asEnumName(rule.ruleType, ALERT_RULE_TYPES),
    targetId: null,
    condition: asEnumName(rule.condition, ALERT_CONDITIONS),
    thresholdValue: rule.threshold,
    channel: (channel === '' ? null : channel) as NotificationChannel | null,
    isActive: rule.isEnabled,
    createdAt: null,
  }
}

export const alertsApi = {
  getRules: () =>
    httpClient.get<SlushAlertRuleDto[]>('/Alerts/rules').then((r): AlertRuleDto[] => r.data.map(mapRule)),

  createRule: (request: {
    name: string
    type: string
    targetId?: string | null
    condition: string
    thresholdValue: number
    channel: NotificationChannel
    isActive: boolean
  }) =>
    httpClient
      .post<SlushAlertRuleDto>('/Alerts/rules', {
        ruleName: request.name,
        ruleType: request.type,
        condition: request.condition,
        threshold: request.thresholdValue,
        channel: request.channel,
        isEnabled: request.isActive,
      })
      .then((r) => r.data)
      .then(mapRule),

  updateRule: async (_id: string): Promise<AlertRuleDto | null> => {
    console.info('[alertsApi] updateRule: эндпоинт отсутствует в Slush API')
    return null
  },

  toggleRule: async (_id: string, _isActive: boolean): Promise<AlertRuleDto | null> => {
    console.info('[alertsApi] toggleRule: эндпоинт отсутствует в Slush API')
    return null
  },

  deleteRule: async (_id: string): Promise<void> => {
    console.info('[alertsApi] deleteRule: эндпоинт отсутствует в Slush API')
  },

  getHistory: async (limit = 100, _unreadOnly = false): Promise<AlertHistoryDto[]> => {
    const raw = await httpClient
      .get<SlushPagedResultDto<SlushAlertHistoryDto>>('/Alerts/history', { params: { page: 1, pageSize: limit } })
      .then((r) => r.data)
    return (raw.items ?? []).map(mapHistoryItem)
  },

  /** Эндпоинта нет в Slush API — считаем непрочитанными локально по истории. */
  unreadCount: async (): Promise<number> => {
    const history = await alertsApi.getHistory(100)
    return history.filter((item) => !item.isRead).length
  },

  markAsRead: async (_id: string): Promise<void> => {
    // Эндпоинта нет — состояние меняется только локально (см. useAlerts).
  },

  markAllAsRead: async (): Promise<void> => {
    // Эндпоинта нет — состояние меняется только локально (см. useAlerts).
  },

  evaluate: async (): Promise<number> => {
    console.info('[alertsApi] evaluate: эндпоинт отсутствует в Slush API')
    return 0
  },
}
