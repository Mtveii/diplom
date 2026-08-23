export type AlertRuleType = string

export type AlertCondition = string

export interface AlertRuleDto {
  id: string
  name: string
  type: AlertRuleType
  targetId: string | null
  condition: AlertCondition
  thresholdValue: number
  isActive: boolean
  createdAt: string | null
}

export interface AlertHistoryDto {
  id: string
  ruleId: number | null
  ruleName: string
  triggeredAt: string
  message: string
  isRead: boolean
}
