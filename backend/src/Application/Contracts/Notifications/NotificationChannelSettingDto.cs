using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Notifications;

public sealed record NotificationChannelSettingDto(
    NotificationChannel Channel,
    bool IsEnabled,
    string? ConfigJson);