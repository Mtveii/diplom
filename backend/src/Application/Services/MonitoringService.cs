using SteamAdminPanel.Application.Contracts.Monitoring;
using SteamAdminPanel.Application.Exceptions;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Services;

public sealed class MonitoringService : IMonitoringService
{
    private const int PeriodDayCount = 30;

    private readonly IMonitoringQueries _queries;
    private readonly IRepository<ClanMember> _members;
    private readonly IRepository<User> _users;
    private readonly IRepository<MembershipApplication> _applications;
    private readonly IRepository<AlertRule> _alertRules;
    private readonly IRepository<PlayerStatusSnapshot> _statusSnapshots;
    private readonly IRepository<GameStatsSnapshot> _gameStatsSnapshots;
    private readonly IRepository<AchievementSnapshot> _achievementSnapshots;
    private readonly ISteamApiClient _steamApi;
    private readonly ISnapshotService _snapshotService;
    private readonly IClock _clock;

    public MonitoringService(
        IMonitoringQueries queries,
        IRepository<ClanMember> members,
        IRepository<User> users,
        IRepository<MembershipApplication> applications,
        IRepository<AlertRule> alertRules,
        IRepository<PlayerStatusSnapshot> statusSnapshots,
        IRepository<GameStatsSnapshot> gameStatsSnapshots,
        IRepository<AchievementSnapshot> achievementSnapshots,
        ISteamApiClient steamApi,
        ISnapshotService snapshotService,
        IClock clock)
    {
        _queries = queries;
        _members = members;
        _users = users;
        _applications = applications;
        _alertRules = alertRules;
        _statusSnapshots = statusSnapshots;
        _gameStatsSnapshots = gameStatsSnapshots;
        _achievementSnapshots = achievementSnapshots;
        _steamApi = steamApi;
        _snapshotService = snapshotService;
        _clock = clock;
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var totalMembers = await CountMembersAsync(cancellationToken);
        var pendingApplications = await CountPendingApplicationsAsync(cancellationToken);
        var activeRules = await CountActiveRulesAsync(cancellationToken);
        var onlineToday = await CountDistinctOnlineSinceAsync(now.Date, cancellationToken);
        var activeThisWeek = await CountDistinctOnlineSinceAsync(now.AddDays(-7), cancellationToken);

        var statuses = await _statusSnapshots.ListAsync(null, cancellationToken);
        var onlineNow = statuses
            .GroupBy(x => x.SteamId64)
            .Select(g => g.OrderByDescending(x => x.Timestamp).First())
            .Count(x => x.IsOnline);

        return new DashboardSummaryDto(
            totalMembers,
            onlineNow,
            onlineToday,
            activeThisWeek,
            pendingApplications,
            activeRules);
    }

    public async Task<IReadOnlyList<OnlineStatusDto>> GetOnlineMembersAsync(CancellationToken cancellationToken)
    {
        var statuses = await _statusSnapshots.ListAsync(null, cancellationToken);
        return statuses
            .GroupBy(x => x.SteamId64)
            .Select(g => g.OrderByDescending(x => x.Timestamp).First())
            .Where(x => x.IsOnline)
            .Select(x => new OnlineStatusDto(x.SteamId64, true, x.GameId, x.GameName, x.Timestamp))
            .ToList();
    }

    public Task<IReadOnlyList<ActivityPointDto>> GetActivitySeriesAsync(string period,
        CancellationToken cancellationToken)
    {
        var days = period.ToLowerInvariant() switch
        {
            "day" => 1,
            "week" => 7,
            "month" => 30,
            _ => PeriodDayCount
        };

        return _queries.GetActivitySeriesAsync(_clock.UtcNow.AddDays(-days), cancellationToken);
    }

    public Task<IReadOnlyList<HeatmapPointDto>> GetHeatmapAsync(int days, CancellationToken cancellationToken)
    {
        return _queries.GetHeatmapAsync(_clock.UtcNow.AddDays(-days), cancellationToken);
    }

    public async Task<IReadOnlyList<TopPlayerDto>> GetTopPlayersAsync(string period, int limit,
        CancellationToken cancellationToken)
    {
        var days = period.ToLowerInvariant() switch
        {
            "week" => 7,
            "month" => 30,
            _ => 14
        };

        var topPlayers = await _queries.GetTopPlayersAsync(_clock.UtcNow.AddDays(-days), limit,
            cancellationToken);

        // Дополняем никами из таблицы пользователей.
        var steamIds = topPlayers.Select(x => x.SteamId64).ToList();
        var users = steamIds.Count == 0
            ? Array.Empty<User>()
            : await _users.ListAsync(u => steamIds.Contains(u.SteamId64), cancellationToken);

        return topPlayers
            .Select(p => new TopPlayerDto(
                p.SteamId64,
                users.FirstOrDefault(u => u.SteamId64 == p.SteamId64)?.Username ?? $"Player_{p.SteamId64[^4..]}",
                p.MinutesPlayed,
                p.HoursPlayed))
            .ToList();
    }

    public async Task<GameMonitorDto> GetGameMonitorAsync(uint appId, CancellationToken cancellationToken)
    {
        var snapshots = await _gameStatsSnapshots.ListAsync(x => x.AppId == appId, cancellationToken);
        if (snapshots.Count == 0)
        {
            // Нет накопленных данных (джоба собирает раз в сутки только для игр с алертами) —
            // собираем свежий снапшот по требованию, чтобы цена и ревью были видны сразу.
            await _snapshotService.CollectGameStatsAsync(new[] { appId }, cancellationToken);
            snapshots = await _gameStatsSnapshots.ListAsync(x => x.AppId == appId, cancellationToken);
        }

        var latest = snapshots.OrderByDescending(x => x.Timestamp).FirstOrDefault();

        var trend = snapshots
            .OrderBy(x => x.Timestamp)
            .Select(x => new GameTrendPointDto(
                x.Timestamp,
                x.Price,
                x.DiscountPercent,
                x.PositiveReviewPercent,
                x.TotalReviews))
            .ToList();

        var achievements = await LoadAchievementComparisonAsync(appId, cancellationToken);
        var clanOwners = await CountClanOwnersAsync(appId, cancellationToken);

        return new GameMonitorDto(
            appId,
            $"App {appId}",
            latest?.Price,
            latest?.DiscountPercent,
            latest?.PositiveReviewPercent,
            latest?.TotalReviews,
            trend,
            achievements,
            clanOwners);
    }

    private async Task<IReadOnlyList<AchievementComparisonDto>> LoadAchievementComparisonAsync(uint appId,
        CancellationToken cancellationToken)
    {
        var snapshots = await _achievementSnapshots.ListAsync(x => x.AppId == appId, cancellationToken);
        var globalPercents = new Dictionary<string, decimal>(
            (await SafeGetGlobalAchievementsAsync(appId, cancellationToken))
            .Select(x => new KeyValuePair<string, decimal>(x.AchievementId, x.Percent)));

        return snapshots
            .GroupBy(x => x.AchievementId)
            .Select(g =>
            {
                var unlockedCount = g.Count(x => x.Unlocked);
                var totalCount = g.Count();
                var clanPercent = totalCount == 0 ? 0m : (decimal)unlockedCount / totalCount * 100m;
                return new AchievementComparisonDto(
                    g.Key,
                    null,
                    clanPercent,
                    globalPercents.GetValueOrDefault(g.Key),
                    totalCount);
            })
            .OrderByDescending(x => x.ClanUnlockPercent)
            .ToList();
    }

    private async Task<IReadOnlyList<Contracts.Steam.AchievementPercentDto>> SafeGetGlobalAchievementsAsync(
        uint appId, CancellationToken cancellationToken)
    {
        try
        {
            return await _steamApi.GetGlobalAchievementPercentagesAsync(appId, cancellationToken);
        }
        catch (Exception)
        {
            return Array.Empty<Contracts.Steam.AchievementPercentDto>();
        }
    }

    private async Task<int> CountClanOwnersAsync(uint appId, CancellationToken cancellationToken)
    {
        var snapshots = await _achievementSnapshots.ListAsync(x => x.AppId == appId, cancellationToken);
        return snapshots.Select(x => x.SteamId64).Distinct().Count();
    }

    private async Task<int> CountMembersAsync(CancellationToken cancellationToken)
    {
        return await _members.CountAsync(null, cancellationToken);
    }

    private async Task<int> CountPendingApplicationsAsync(CancellationToken cancellationToken)
    {
        return await _applications.CountAsync(
            x => x.Status == MembershipApplicationStatus.Pending, cancellationToken);
    }

    private async Task<int> CountActiveRulesAsync(CancellationToken cancellationToken)
    {
        return await _alertRules.CountAsync(x => x.IsActive, cancellationToken);
    }

    private async Task<int> CountDistinctOnlineSinceAsync(DateTime since, CancellationToken cancellationToken)
    {
        var onlineIds = await _queries.GetDistinctOnlineSteamIdsAsync(since, _clock.UtcNow, cancellationToken);
        return onlineIds.Count;
    }
}