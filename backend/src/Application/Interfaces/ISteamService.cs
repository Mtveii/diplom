using SteamAdminPanel.Application.Contracts.Steam;

namespace SteamAdminPanel.Application.Interfaces;

public interface ISteamService
{
    Task<IReadOnlyList<SteamPlayerSummaryDto>> GetPlayerSummariesAsync(IEnumerable<string> steamIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OwnedGameDto>> GetOwnedGamesAsync(string steamId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SteamNewsItemDto>> GetNewsAsync(uint appId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<(uint AppId, string Name)>> SearchGamesAsync(string query, int limit = 20,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AchievementPercentDto>> GetGlobalAchievementsAsync(uint appId,
        CancellationToken cancellationToken = default);
}