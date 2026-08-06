using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>
/// Раз в неделю: email-дайджест со статистикой клана (активность, топ игроков, риск оттока).
/// </summary>
public sealed class WeeklyDigestJob
{
    private readonly IAnalyticsService _analyticsService;
    private readonly IMonitoringService _monitoringService;
    private readonly IAlertService _alertService;
    private readonly INotificationDispatcher _dispatcher;

    public WeeklyDigestJob(IAnalyticsService analyticsService, IMonitoringService monitoringService,
        IAlertService alertService, INotificationDispatcher dispatcher)
    {
        _analyticsService = analyticsService;
        _monitoringService = monitoringService;
        _alertService = alertService;
        _dispatcher = dispatcher;
    }

    public async Task RunAsync()
    {
        var summary = await _monitoringService.GetDashboardSummaryAsync(CancellationToken.None);
        var comparison = await _analyticsService.ComparePeriodsAsync(7, CancellationToken.None);
        var topPlayers = await _monitoringService.GetTopPlayersAsync("week", 10, CancellationToken.None);
        var unreadAlerts = await _alertService.GetUnreadCountAsync(CancellationToken.None);

        var topPlayersText = string.Join(Environment.NewLine,
            topPlayers
                .Take(5)
                .Select((p, i) => $"{i + 1}. {p.Username} — {p.HoursPlayed:F1} часов за 2 недели"));

        var body = $"Еженедельный дайджест клана{Environment.NewLine}{Environment.NewLine}" +
                   $"Онлайн сейчас: {summary.OnlineNow} из {summary.TotalMembers}{Environment.NewLine}" +
                   $"Активных за неделю: {summary.ActiveThisWeek}{Environment.NewLine}" +
                   $"Активность vs прошлая неделя: {comparison.ActivePlayersChangePercent:+#.#;-#.#;0}%{Environment.NewLine}" +
                   $"Топ игроков:{Environment.NewLine}{topPlayersText}{Environment.NewLine}" +
                   $"Непрочитанных алертов: {unreadAlerts}";

        await _dispatcher.SendAsync(
            new NotificationMessage("Weekly digest", body, "info"), CancellationToken.None);
    }
}