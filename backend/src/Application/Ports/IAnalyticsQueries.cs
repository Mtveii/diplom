namespace SteamAdminPanel.Application.Ports;

/// <summary>
/// Агрегирующие запросы для аналитики (retention, churn, когорты, сравнение периодов).
/// </summary>
public interface IAnalyticsQueries
{
    Task<IReadOnlyList<(string SteamId64, DateTime JoinedAt)>> GetMemberJoinDatesAsync(
        CancellationToken cancellationToken = default);

    Task<DateTime?> GetLastOnlineAsync(string steamId64, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetActiveSteamIdsInRangeAsync(DateTime from, DateTime to,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<int>> GetDailyOnlineCountsAsync(DateTime from, DateTime to,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<string, long>> GetLatestTwoWeekPlaytimePerMemberAsync(DateTime asOf,
        CancellationToken cancellationToken = default);
}