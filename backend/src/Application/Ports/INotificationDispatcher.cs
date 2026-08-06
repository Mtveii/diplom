namespace SteamAdminPanel.Application.Ports;

public sealed record NotificationMessage(string Title, string Body, string? Severity = null);

public interface INotificationDispatcher
{
    Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default);
}