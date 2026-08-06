using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>
/// Раз в сутки: снапшот статистики отслеживаемых игр (цена, скидка, % положительных ревью).
/// Отслеживаемые игры = цели правил алертов по играм + уже отслеживаемые AppId.
/// </summary>
public sealed class GameStatsSnapshotJob
{
    private readonly ISnapshotService _snapshotService;
    private readonly IRepository<AlertRule> _rules;
    private readonly IRepository<GameStatsSnapshot> _snapshots;

    public GameStatsSnapshotJob(ISnapshotService snapshotService, IRepository<AlertRule> rules,
        IRepository<GameStatsSnapshot> snapshots)
    {
        _snapshotService = snapshotService;
        _rules = rules;
        _snapshots = snapshots;
    }

    public async Task RunAsync()
    {
        var ruleAppIds = (await _rules.ListAsync(x => x.IsActive, CancellationToken.None))
            .Where(x => x.Type is AlertRuleType.DiscountStarted or AlertRuleType.ReviewDrop or AlertRuleType.NewsRelease)
            .Select(x => uint.TryParse(x.TargetId, out var id) ? id : 0u)
            .Where(id => id > 0);

        var existingAppIds = (await _snapshots.ListAsync(null, CancellationToken.None))
            .Select(x => x.AppId);

        var appIds = ruleAppIds.Concat(existingAppIds).Distinct().ToList();
        await _snapshotService.CollectGameStatsAsync(appIds, CancellationToken.None);
    }
}