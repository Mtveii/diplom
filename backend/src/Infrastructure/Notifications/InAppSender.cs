using SteamAdminPanel.Application.Contracts.Alerts;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Infrastructure.Notifications;

/// <summary>
/// In-app уведомления — дублируются в историю алертов и пушатся в SignalR-хаб дашборда.
/// </summary>
public sealed class InAppSender : INotificationSender
{
    private readonly IDashboardHubClient _hub;

    public InAppSender(IDashboardHubClient hub)
    {
        _hub = hub;
    }

    public NotificationChannel Channel => NotificationChannel.InApp;

    public async Task SendAsync(NotificationMessage message, string? configJson,
        CancellationToken cancellationToken)
    {
        var dto = new AlertHistoryDto(
            Id: 0,
            RuleId: 0,
            RuleName: message.Title,
            TriggeredAt: DateTime.UtcNow,
            Message: message.Body,
            IsRead: false);

        await _hub.PushAlertAsync(dto, cancellationToken);
    }
}