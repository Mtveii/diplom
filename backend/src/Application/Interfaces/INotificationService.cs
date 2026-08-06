using SteamAdminPanel.Application.Contracts.Notifications;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Interfaces;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationChannelSettingDto>> GetChannelSettingsAsync(
        CancellationToken cancellationToken = default);

    Task<NotificationChannelSettingDto> UpdateChannelSettingAsync(NotificationChannel channel,
        UpdateNotificationChannelRequestDto request, CancellationToken cancellationToken = default);

    Task SendTestAsync(NotificationChannel channel, CancellationToken cancellationToken = default);
}