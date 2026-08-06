using Microsoft.AspNetCore.SignalR;
using SteamAdminPanel.Application.Contracts.Alerts;
using SteamAdminPanel.Application.Contracts.Monitoring;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Api.Hubs;

/// <summary>
/// SignalR-хаб мониторинг-центра: live-статусы участников + пуши алертов.
/// Фронтенд подключается через @microsoft/signalr.
/// </summary>
public sealed class DashboardHub : Hub
{
    public override Task OnConnectedAsync()
    {
        // Публичная подписка для всех авторизованных пользователей — не фильтруем здесь.
        return base.OnConnectedAsync();
    }
}

/// <summary>
/// Реализация IDashboardHubClient: пушит события в хаб из фоновых джоб.
/// </summary>
public sealed class DashboardHubNotifier : IDashboardHubClient
{
    private readonly IHubContext<DashboardHub> _hubContext;

    public DashboardHubNotifier(IHubContext<DashboardHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task PushOnlineStatusAsync(OnlineStatusDto status, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.All.SendAsync("OnlineStatusChanged", status, cancellationToken);
    }

    public Task PushAlertAsync(AlertHistoryDto alert, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.All.SendAsync("AlertTriggered", alert, cancellationToken);
    }
}