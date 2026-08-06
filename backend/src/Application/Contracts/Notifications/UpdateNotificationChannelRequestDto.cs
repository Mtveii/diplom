namespace SteamAdminPanel.Application.Contracts.Notifications;

public sealed record UpdateNotificationChannelRequestDto(bool IsEnabled, string? ConfigJson);