using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>Раз в час: обновление playtime участников клана.</summary>
public sealed class PlaytimeCollectionJob
{
    private readonly ISnapshotService _snapshotService;

    public PlaytimeCollectionJob(ISnapshotService snapshotService)
    {
        _snapshotService = snapshotService;
    }

    public async Task RunAsync()
    {
        await _snapshotService.CollectPlaytimeAsync(CancellationToken.None);
    }
}