using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>Каждые 5 минут: опрос онлайн-статусов участников + live-пуши в дашборд.</summary>
public sealed class OnlineStatusCollectionJob
{
    private readonly ISnapshotService _snapshotService;

    public OnlineStatusCollectionJob(ISnapshotService snapshotService)
    {
        _snapshotService = snapshotService;
    }

    public async Task RunAsync()
    {
        await _snapshotService.CollectOnlineStatusesAsync(CancellationToken.None);
    }
}