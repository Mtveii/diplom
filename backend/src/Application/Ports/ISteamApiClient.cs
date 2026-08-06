using SteamAdminPanel.Application.Contracts.Steam;

namespace SteamAdminPanel.Application.Ports;

public interface ISteamApiClient
{
    Task<IReadOnlyList<SteamPlayerSummaryDto>> GetPlayerSummariesAsync(IEnumerable<string> steamIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OwnedGameDto>> GetOwnedGamesAsync(string steamId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AchievementPercentDto>> GetGlobalAchievementPercentagesAsync(uint appId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SteamNewsItemDto>> GetNewsForAppAsync(uint appId, int count = 5,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<(uint AppId, string Name)>> GetAppListAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetSteamGroupMemberIdsAsync(string groupId,
        CancellationToken cancellationToken = default);

    Task<GameStatsDto?> GetGameStatsAsync(uint appId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlayerAchievementDto>> GetPlayerAchievementsAsync(string steamId, uint appId,
        CancellationToken cancellationToken = default);
}