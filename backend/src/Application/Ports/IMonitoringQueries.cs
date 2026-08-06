using SteamAdminPanel.Application.Contracts.Monitoring;

namespace SteamAdminPanel.Application.Ports;

/// <summary>
/// Агрегирующие запросы для мониторинга (работают напрямую с БД).
/// </summary>
public interface IMonitoringQueries
{
    Task<IReadOnlyList<ActivityPointDto>> GetActivitySeriesAsync(DateTime from,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<HeatmapPointDto>> GetHeatmapAsync(DateTime from,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TopPlayerDto>> GetTopPlayersAsync(DateTime from, int limit,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetDistinctOnlineSteamIdsAsync(DateTime from, DateTime to,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<DateTime, int>> GetDailyOnlineCountsAsync(DateTime from, DateTime to,
        CancellationToken cancellationToken = default);
}