using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Application.Services;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;
using Xunit;

namespace SteamAdminPanel.Application.Tests;

public sealed class AnalyticsServiceTests
{
    private static readonly DateTime Now = new(2026, 1, 10, 12, 0, 0, DateTimeKind.Utc);

    private readonly IAnalyticsQueries _queries = Substitute.For<IAnalyticsQueries>();
    private readonly IRepository<ClanMember> _members = Substitute.For<IRepository<ClanMember>>();
    private readonly IRepository<User> _users = Substitute.For<IRepository<User>>();
    private readonly IReportExporter _reportExporter = Substitute.For<IReportExporter>();
    private readonly IClock _clock = Substitute.For<IClock>();

    private AnalyticsService CreateService()
    {
        _clock.UtcNow.Returns(Now);
        return new AnalyticsService(_queries, _members, _users, _reportExporter, _clock,
            Substitute.For<ILogger<AnalyticsService>>());
    }

    [Fact]
    public async Task GetChurnRiskAsync_FlagsMemberInactiveLongerThanThreshold()
    {
        const string steamId = "76561198212420000";
        _queries.GetMemberJoinDatesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { (steamId, Now.AddYears(-1)) });
        _users.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<User, bool>>?>(), Arg.Any<CancellationToken>())
            .Returns(new[] { new User(steamId, "Alpha", string.Empty, UserRole.Viewer) });
        _queries.GetLastOnlineAsync(steamId, Arg.Any<CancellationToken>())
            .Returns<DateTime?>(Now.AddDays(-20));

        var service = CreateService();
        var result = await service.GetChurnRiskAsync(14, CancellationToken.None);

        result.Should().HaveCount(1);
        result[0].SteamId64.Should().Be(steamId);
        result[0].Username.Should().Be("Alpha");
        result[0].DaysWithoutLogin.Should().Be(20);
        result[0].RiskScore.Should().BeGreaterThan(0.9);
    }

    [Fact]
    public async Task GetChurnRiskAsync_IgnoresMemberWithoutLoginHistory()
    {
        const string steamId = "76561198212420000";
        _queries.GetMemberJoinDatesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { (steamId, Now.AddYears(-1)) });
        _users.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<User, bool>>?>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<User>());
        _queries.GetLastOnlineAsync(steamId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<DateTime?>(null));

        var service = CreateService();
        var result = await service.GetChurnRiskAsync(14, CancellationToken.None);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetChurnRiskAsync_IgnoresActiveMembers()
    {
        const string steamId = "76561198212420000";
        _queries.GetMemberJoinDatesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { (steamId, Now.AddYears(-1)) });
        _users.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<User, bool>>?>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<User>());
        _queries.GetLastOnlineAsync(steamId, Arg.Any<CancellationToken>())
            .Returns<DateTime?>(Now.AddHours(-1));

        var service = CreateService();
        var result = await service.GetChurnRiskAsync(14, CancellationToken.None);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetRetentionAsync_WithNoJoinsInWindow_ReturnsZeroPoints()
    {
        _queries.GetMemberJoinDatesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { (SteamId64: "76561198212420000", JoinedAt: Now.AddYears(-3)) });

        var service = CreateService();
        var result = await service.GetRetentionAsync(90, CancellationToken.None);

        result.Should().NotBeEmpty();
        result.Should().OnlyContain(p => p.RetainedPercent == 0);
    }
}