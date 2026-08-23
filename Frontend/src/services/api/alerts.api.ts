import { httpClient } from './httpClient'
import type { AlertHistoryDto, AlertRuleDto } from '@/types/alert'

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
    ruleName: item.ruleName ?? 'Без правила',
    triggeredAt: item.timestamp,
    message: item.message ?? '',
    isRead: item.isRead,
  }
}

export const alertsApi = {
  getRules: () =>
    httpClient.get<SlushAlertRuleDto[]>('/Alerts/rules').then((r): AlertRuleDto[] =>
      r.data.map((rule) => ({
        id: rule.id,
        name: rule.ruleName ?? 'Без названия',
        type: String(rule.ruleType),
        targetId: null,
        condition: String(rule.condition),
        thresholdValue: rule.threshold,
        isActive: rule.isEnabled,
        createdAt: null,
      })),
    ),

  createRule: (request: {
    name: string
    type?: string
    targetId?: string | null
    condition?: string
    thresholdValue: number
    isActive: boolean
  }) =>
    httpClient
      .post<SlushAlertRuleDto>('/Alerts/rules', {
        ruleName: request.name,
        ruleType: 0,
        condition: 0,
        threshold: request.thresholdValue,
        channel: 0,
        isEnabled: request.isActive,
      })
      .then((r) => r.data)
      .then((rule): AlertRuleDto => ({
        id: rule.id,
        name: rule.ruleName ?? 'Без названия',
        type: String(rule.ruleType),
        targetId: null,
        condition: String(rule.condition),
        thresholdValue: rule.threshold,
        isActive: rule.isEnabled,
        createdAt: null,
      })),

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
