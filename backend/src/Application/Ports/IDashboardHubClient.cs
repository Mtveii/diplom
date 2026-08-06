using SteamAdminPanel.Application.Contracts.Monitoring;

namespace SteamAdminPanel.Application.Ports;

/// <summary>
/// Клиент SignalR-хаба дашборда — используется фоновыми джобами для live-обновления.
/// </summary>
public interface IDashboardHubClient
{
    Task PushOnlineStatusAsync(OnlineStatusDto status, CancellationToken cancellationToken = default);

    Task PushAlertAsync(Contracts.Alerts.AlertHistoryDto alert, CancellationToken cancellationToken = default);
}