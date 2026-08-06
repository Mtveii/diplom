using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>
/// Раз в сутки: снапшот ачивок по конкретному AppId для всех участников клана.
/// Запускается по переданному appId.
/// </summary>
public sealed class AchievementSnapshotJob
{
    private readonly ISnapshotService _snapshotService;
    private readonly IRepository<ClanMember> _members;

    public AchievementSnapshotJob(ISnapshotService snapshotService, IRepository<ClanMember> members)
    {
        _snapshotService = snapshotService;
        _members = members;
    }

    public async Task RunAsync(uint appId)
    {
        var members = await _members.ListAsync(null, CancellationToken.None);
        await _snapshotService.CollectAchievementsAsync(members.Select(x => x.SteamId64), appId,
            CancellationToken.None);
    }
}