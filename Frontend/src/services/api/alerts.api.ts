import { httpClient } from './httpClient'
import { getLocaleDictionary } from '@/store/localeStore'
import type { AlertHistoryDto, AlertRuleDto } from '@/types/alert'
import type { NotificationChannel } from '@/types/notification'

/**
 * Маппинги строковых имён UI на int-enum Slush API.
 * Порядок подтверждён историей проекта (backend/src/Domain/Enums):
 * AlertRuleType { NoLoginFor = 0, ReviewDrop = 1, DiscountStarted = 2 },
 * AlertCondition { LessThan = 0, GreaterThan = 1, Equals = 2 },
 * NotificationChannel { Discord = 0, Telegram = 1, Email = 2, InApp = 3 }.
 * NewsRelease в Slush API отсутствует (только 0–2) и из UI убран.
 */
const RULE_TYPE_TO_INT: Record<string, number> = {
  NoLoginFor: 0,
  ReviewDrop: 1,
  DiscountStarted: 2,
}

const INT_TO_RULE_TYPE: Record<number, string> = {
  0: 'NoLoginFor',
  1: 'ReviewDrop',
  2: 'DiscountStarted',
}

const CONDITION_TO_INT: Record<string, number> = {
  LessThan: 0,
  GreaterThan: 1,
  Equals: 2,
}

const INT_TO_CONDITION: Record<number, string> = {
  0: 'LessThan',
  1: 'GreaterThan',
  2: 'Equals',
}

const CHANNEL_TO_INT: Record<NotificationChannel, number> = {
  Discord: 0,
  Telegram: 1,
  Email: 2,
  InApp: 3,
}

const INT_TO_CHANNEL: Record<number, NotificationChannel> = {
  0: 'Discord',
  1: 'Telegram',
  2: 'Email',
  3: 'InApp',
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
  ruleType: number
  condition: number
  threshold: number
  channel: number
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

function mapRule(rule: SlushAlertRuleDto): AlertRuleDto {
  return {
    id: rule.id,
    name: rule.ruleName ?? getLocaleDictionary().common.untitled,
    type: INT_TO_RULE_TYPE[rule.ruleType] ?? String(rule.ruleType),
    targetId: null,
    condition: INT_TO_CONDITION[rule.condition] ?? String(rule.condition),
    thresholdValue: rule.threshold,
    channel: INT_TO_CHANNEL[rule.channel] ?? null,
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
        ruleType: RULE_TYPE_TO_INT[request.type] ?? 0,
        condition: CONDITION_TO_INT[request.condition] ?? 0,
        threshold: request.thresholdValue,
        channel: CHANNEL_TO_INT[request.channel] ?? 0,
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
