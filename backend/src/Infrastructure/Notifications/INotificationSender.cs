namespace SteamAdminPanel.Infrastructure.Notifications;

public interface INotificationSender
{
    Domain.Enums.NotificationChannel Channel { get; }

    Task SendAsync(Application.Ports.NotificationMessage message, string? configJson,
        CancellationToken cancellationToken);
}