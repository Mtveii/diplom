export type NotificationChannel = 'Discord' | 'Telegram' | 'Email' | 'InApp'

export interface NotificationChannelSettingDto {
  channel: NotificationChannel
  isEnabled: boolean
  configJson: string | null
}