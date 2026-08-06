using SteamAdminPanel.Application.Contracts.Monitoring;

namespace SteamAdminPanel.Application.Interfaces;

public interface IMonitoringService
{
    Task<DashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OnlineStatusDto>> GetOnlineMembersAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ActivityPointDto>> GetActivitySeriesAsync(string period,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<HeatmapPointDto>> GetHeatmapAsync(int days, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TopPlayerDto>> GetTopPlayersAsync(string period, int limit = 10,
        CancellationToken cancellationToken = default);

    Task<GameMonitorDto> GetGameMonitorAsync(uint appId, CancellationToken cancellationToken = default);
}