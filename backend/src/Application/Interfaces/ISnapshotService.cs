namespace SteamAdminPanel.Application.Interfaces;

public interface ISnapshotService
{
    Task CollectOnlineStatusesAsync(CancellationToken cancellationToken = default);

    Task CollectPlaytimeAsync(CancellationToken cancellationToken = default);

    Task CollectGameStatsAsync(IEnumerable<uint> appIds, CancellationToken cancellationToken = default);

    Task CollectAchievementsAsync(IEnumerable<string> memberSteamIds, uint appId,
        CancellationToken cancellationToken = default);
}