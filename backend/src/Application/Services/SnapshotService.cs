using SteamAdminPanel.Application.Contracts.Monitoring;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace SteamAdminPanel.Application.Services;

public sealed class SnapshotService : ISnapshotService
{
    private readonly IRepository<ClanMember> _members;
    private readonly IRepository<PlayerStatusSnapshot> _statusSnapshots;
    private readonly IRepository<PlaytimeSnapshot> _playtimeSnapshots;
    private readonly IRepository<GameStatsSnapshot> _gameStatsSnapshots;
    private readonly IRepository<AchievementSnapshot> _achievementSnapshots;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISteamApiClient _steamApi;
    private readonly IClanMemberService _clanMemberService;
    private readonly IDashboardHubClient _dashboardHub;
    private readonly IClock _clock;
    private readonly ILogger<SnapshotService> _logger;

    public SnapshotService(
        IRepository<ClanMember> members,
        IRepository<PlayerStatusSnapshot> statusSnapshots,
        IRepository<PlaytimeSnapshot> playtimeSnapshots,
        IRepository<GameStatsSnapshot> gameStatsSnapshots,
        IRepository<AchievementSnapshot> achievementSnapshots,
        IUnitOfWork unitOfWork,
        ISteamApiClient steamApi,
        IClanMemberService clanMemberService,
        IDashboardHubClient dashboardHub,
        IClock clock,
        ILogger<SnapshotService> logger)
    {
        _members = members;
        _statusSnapshots = statusSnapshots;
        _playtimeSnapshots = playtimeSnapshots;
        _gameStatsSnapshots = gameStatsSnapshots;
        _achievementSnapshots = achievementSnapshots;
        _unitOfWork = unitOfWork;
        _steamApi = steamApi;
        _clanMemberService = clanMemberService;
        _dashboardHub = dashboardHub;
        _clock = clock;
        _logger = logger;
    }

    public async Task CollectOnlineStatusesAsync(CancellationToken cancellationToken)
    {
        var memberSteamIds = await GetMemberSteamIdsAsync(cancellationToken);
        if (memberSteamIds.Count == 0)
        {
            return;
        }

        var summaries = await _steamApi.GetPlayerSummariesAsync(memberSteamIds, cancellationToken);
        if (summaries.Count == 0)
        {
            return;
        }

        var previousSnapshots = await _statusSnapshots.ListAsync(null, cancellationToken);
        var lastByMember = previousSnapshots
            .GroupBy(x => x.SteamId64)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Timestamp).First());

        var now = _clock.UtcNow;
        foreach (var summary in summaries)
        {
            var isOnline = summary.PersonaState > 0;
            int? gameId = null;
            string? gameName = null;
            if (isOnline && int.TryParse(summary.GameId, out var parsedGameId))
            {
                gameId = parsedGameId;
                gameName = summary.GameExtraInfo;
            }

            var snapshot = new PlayerStatusSnapshot(summary.SteamId64, isOnline, gameId, gameName, now);

            if (lastByMember.TryGetValue(summary.SteamId64, out var last) &&
                last.IsOnline == isOnline && last.GameId == gameId)
            {
                // Статус не изменился — снапшот не пишем, чтобы не засорять timeseries.
                continue;
            }

            _statusSnapshots.Add(snapshot);
            await _dashboardHub.PushOnlineStatusAsync(
                new OnlineStatusDto(summary.SteamId64, isOnline, gameId, gameName, now), cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _clanMemberService.TrackProfileChangesAsync(summaries, cancellationToken);

        _logger.LogInformation("Снапшоты онлайн-статусов собраны для {Count} участников", summaries.Count);
    }

    public async Task CollectPlaytimeAsync(CancellationToken cancellationToken)
    {
        var memberSteamIds = await GetMemberSteamIdsAsync(cancellationToken);
        var now = _clock.UtcNow;
        var added = 0;

        foreach (var steamId in memberSteamIds)
        {
            var games = await _steamApi.GetOwnedGamesAsync(steamId, cancellationToken);
            foreach (var game in games)
            {
                _playtimeSnapshots.Add(new PlaytimeSnapshot(
                    steamId,
                    game.AppId,
                    game.PlaytimeMinutesTotal,
                    game.PlaytimeMinutesLastTwoWeeks));
                added++;
            }

            if (added > 500)
            {
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                added = 0;
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Снапшоты playtime собраны для {Count} участников", memberSteamIds.Count);
    }

    public async Task CollectGameStatsAsync(IEnumerable<uint> appIds, CancellationToken cancellationToken)
    {
        foreach (var appId in appIds.Distinct())
        {
            var stats = await _steamApi.GetGameStatsAsync(appId, cancellationToken);
            if (stats is null)
            {
                continue;
            }

            _gameStatsSnapshots.Add(new GameStatsSnapshot(
                appId,
                stats.Price,
                stats.DiscountPercent,
                stats.PositiveReviewPercent,
                stats.TotalReviews,
                stats.OwnerCount));
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task CollectAchievementsAsync(IEnumerable<string> memberSteamIds, uint appId,
        CancellationToken cancellationToken)
    {
        var steamIds = memberSteamIds.Distinct().ToList();
        var now = _clock.UtcNow;

        foreach (var steamId in steamIds)
        {
            var achievements = await _steamApi.GetPlayerAchievementsAsync(steamId, appId, cancellationToken);
            foreach (var achievement in achievements)
            {
                _achievementSnapshots.Add(new AchievementSnapshot(
                    steamId,
                    appId,
                    achievement.AchievementId,
                    achievement.Unlocked,
                    achievement.Unlocked ? now : null));
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Снапшоты ачивок собраны для {Count} участников по игре {AppId}",
            steamIds.Count, appId);
    }

    private async Task<IReadOnlyList<string>> GetMemberSteamIdsAsync(CancellationToken cancellationToken)
    {
        var members = await _members.ListAsync(null, cancellationToken);
        return members.Select(x => x.SteamId64).ToList();
    }
}