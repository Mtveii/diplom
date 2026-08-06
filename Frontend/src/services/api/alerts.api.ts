import { httpClient } from './httpClient'
import type {
  AlertCondition,
  AlertHistoryDto,
  AlertRuleDto,
  AlertRuleType,
} from '@/types/alert'

export const alertsApi = {
  getRules: () => httpClient.get<AlertRuleDto[]>('/alerts/rules').then((r) => r.data),

  createRule: (request: {
    name: string
    type: AlertRuleType
    targetId: string | null
    condition: AlertCondition
    thresholdValue: number
    isActive: boolean
  }) => httpClient.post<AlertRuleDto>('/alerts/rules', request).then((r) => r.data),

  updateRule: (
    id: number,
    request: {
      name: string
      type: AlertRuleType
      targetId: string | null
      condition: AlertCondition
      thresholdValue: number
      isActive: boolean
    },
  ) => httpClient.put<AlertRuleDto>(`/alerts/rules/${id}`, request).then((r) => r.data),

  toggleRule: (id: number, isActive: boolean) =>
    httpClient.patch<AlertRuleDto>(`/alerts/rules/${id}/toggle`, null, { params: { isActive } }).then((r) => r.data),

  deleteRule: (id: number) => httpClient.delete(`/alerts/rules/${id}`),

  getHistory: (limit = 100, unreadOnly = false) =>
    httpClient.get<AlertHistoryDto[]>('/alerts/history', { params: { limit, unreadOnly } }).then((r) => r.data),

  unreadCount: () => httpClient.get<number>('/alerts/unread-count').then((r) => r.data),

  markAsRead: (id: number) => httpClient.post(`/alerts/history/${id}/read`),

  markAllAsRead: () => httpClient.post('/alerts/history/read-all'),

  evaluate: () => httpClient.post<number>('/alerts/evaluate').then((r) => r.data),
}