using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SteamAdminPanel.Application.Contracts.Steam;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Application.Services;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;
using Xunit;

namespace SteamAdminPanel.Application.Tests;

public sealed class AlertServiceTests
{
    private static readonly DateTime Now = new(2026, 1, 10, 12, 0, 0, DateTimeKind.Utc);

    private readonly IRepository<AlertRule> _rules = Substitute.For<IRepository<AlertRule>>();
    private readonly IRepository<AlertHistory> _history = Substitute.For<IRepository<AlertHistory>>();
    private readonly IRepository<PlayerStatusSnapshot> _statusSnapshots =
        Substitute.For<IRepository<PlayerStatusSnapshot>>();
    private readonly IRepository<GameStatsSnapshot> _gameStatsSnapshots =
        Substitute.For<IRepository<GameStatsSnapshot>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ISteamApiClient _steamApi = Substitute.For<ISteamApiClient>();
    private readonly INotificationDispatcher _notifications = Substitute.For<INotificationDispatcher>();
    private readonly IDashboardHubClient _dashboardHub = Substitute.For<IDashboardHubClient>();
    private readonly IClock _clock = Substitute.For<IClock>();

    private AlertService CreateService()
    {
        _clock.UtcNow.Returns(Now);
        _gameStatsSnapshots.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GameStatsSnapshot, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(Array.Empty<GameStatsSnapshot>());
        _history.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<AlertHistory, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(Array.Empty<AlertHistory>());
        _notifications.SendAsync(Arg.Any<NotificationMessage>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        _dashboardHub.PushAlertAsync(Arg.Any<Contracts.Alerts.AlertHistoryDto>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        return new AlertService(
            _rules,
            _history,
            _statusSnapshots,
            _gameStatsSnapshots,
            _unitOfWork,
            _steamApi,
            _notifications,
            _dashboardHub,
            _clock,
            Substitute.For<ILogger<AlertService>>());
    }

    [Fact]
    public async Task EvaluateAllRulesAsync_NoLoginRule_TriggersWhenThresholdExceeded()
    {
        const string steamId = "76561198212420000";
        var rule = new AlertRule(AlertRuleType.NoLoginFor, steamId, AlertCondition.GreaterThan, 5, true,
            "Не заходит 5 дней");
        _rules.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<AlertRule, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(new[] { rule });
        _statusSnapshots.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<PlayerStatusSnapshot, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(new[] { new PlayerStatusSnapshot(steamId, true, null, null, Now.AddDays(-10)) });

        var service = CreateService();
        var triggered = await service.EvaluateAllRulesAsync(CancellationToken.None);

        triggered.Should().Be(1);
        _history.Received(1).Add(Arg.Is<AlertHistory>(h => h.Message.Contains("10")));
        await _notifications.Received(1).SendAsync(Arg.Any<NotificationMessage>(), Arg.Any<CancellationToken>());
        await _dashboardHub.Received(1).PushAlertAsync(Arg.Any<Contracts.Alerts.AlertHistoryDto>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateAllRulesAsync_WhenWithinDeduplicationWindow_SkipsRule()
    {
        const string steamId = "76561198212420000";
        var rule = new AlertRule(AlertRuleType.NoLoginFor, steamId, AlertCondition.GreaterThan, 5, true,
            "Не заходит 5 дней");
        _rules.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<AlertRule, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(new[] { rule });
        _statusSnapshots.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<PlayerStatusSnapshot, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(new[] { new PlayerStatusSnapshot(steamId, true, null, null, Now.AddDays(-10)) });

        var service = CreateService();
        _history.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<AlertHistory, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(new[] { new AlertHistory(rule.Id, "уже сработал") });

        var triggered = await service.EvaluateAllRulesAsync(CancellationToken.None);

        triggered.Should().Be(0);
        _history.DidNotReceive().Add(Arg.Any<AlertHistory>());
        await _notifications.DidNotReceive().SendAsync(Arg.Any<NotificationMessage>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateAllRulesAsync_NoLoginRule_NotTriggeredBelowThreshold()
    {
        const string steamId = "76561198212420000";
        var rule = new AlertRule(AlertRuleType.NoLoginFor, steamId, AlertCondition.GreaterThan, 14, true,
            "Не заходит 14 дней");
        _rules.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<AlertRule, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(new[] { rule });
        _statusSnapshots.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<PlayerStatusSnapshot, bool>>?>(),
                Arg.Any<CancellationToken>())
            .Returns(new[] { new PlayerStatusSnapshot(steamId, true, null, null, Now.AddDays(-10)) });

        var service = CreateService();
        var triggered = await service.EvaluateAllRulesAsync(CancellationToken.None);

        triggered.Should().Be(0);
        await _notifications.DidNotReceive().SendAsync(Arg.Any<NotificationMessage>(), Arg.Any<CancellationToken>());
    }
}