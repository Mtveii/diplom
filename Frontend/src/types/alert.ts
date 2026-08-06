export type AlertRuleType = 'NoLoginFor' | 'ReviewDrop' | 'DiscountStarted' | 'NewsRelease'

export type AlertCondition = 'LessThan' | 'GreaterThan' | 'Equals'

export interface AlertRuleDto {
  id: number
  name: string
  type: AlertRuleType
  targetId: string | null
  condition: AlertCondition
  thresholdValue: number
  isActive: boolean
  createdAt: string
}

export interface AlertHistoryDto {
  id: number
  ruleId: number
  ruleName: string
  triggeredAt: string
  message: string
  isRead: boolean
}