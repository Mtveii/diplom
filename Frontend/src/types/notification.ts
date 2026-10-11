/** 1-в-1 Slush.Domain.Enums.NotificationChannel: Telegram, Discord, Email, Web. */
export type NotificationChannel = 'Discord' | 'Telegram' | 'Email' | 'Web'

export interface NotificationChannelSettingDto {
  channel: NotificationChannel
  isEnabled: boolean
  configJson: string | null
}

/** Друг из Slush API: GET /api/Friends. */
export interface FriendDto {
  id: string
  username: string
  avatarUrl: string | null
  level: number
}

/** Заявка в друзья: GET /api/Friends/requests/incoming|outgoing. */
export interface FriendRequestDto {
  id: string
  username: string
  createdAt: string | null
}

/** Личное уведомление пользователя: GET /api/UserNotifications. */
export interface UserNotificationDto {
  id: string
  text: string
  createdAt: string | null
  isRead: boolean
}