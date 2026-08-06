using Microsoft.EntityFrameworkCore;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Persistence.Queries;

public sealed class AnalyticsQueries : IAnalyticsQueries
{
    private readonly AppDbContext _dbContext;

    public AnalyticsQueries(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<(string SteamId64, DateTime JoinedAt)>> GetMemberJoinDatesAsync(
        CancellationToken cancellationToken)
    {
        var rows = await _dbContext.ClanMembers
            .Select(x => new { x.SteamId64, x.JoinedAt })
            .ToListAsync(cancellationToken);

        return rows.Select(x => (x.SteamId64, x.JoinedAt)).ToList();
    }

    public async Task<DateTime?> GetLastOnlineAsync(string steamId64, CancellationToken cancellationToken)
    {
        return await _dbContext.PlayerStatusSnapshots
            .Where(x => x.SteamId64 == steamId64 && x.IsOnline)
            .OrderByDescending(x => x.Timestamp)
            .Select(x => (DateTime?)x.Timestamp)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetActiveSteamIdsInRangeAsync(DateTime from, DateTime to,
        CancellationToken cancellationToken)
    {
        return await _dbContext.PlayerStatusSnapshots
            .Where(x => x.Timestamp >= from && x.Timestamp <= to && x.IsOnline)
            .Select(x => x.SteamId64)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<int>> GetDailyOnlineCountsAsync(DateTime from, DateTime to,
        CancellationToken cancellationToken)
    {
        var rows = await _dbContext.PlayerStatusSnapshots
            .Where(x => x.Timestamp >= from && x.Timestamp <= to && x.IsOnline)
            .GroupBy(x => x.Timestamp.Date)
            .Select(g => new { Day = g.Key, Count = g.Select(x => x.SteamId64).Distinct().Count() })
            .OrderBy(x => x.Day)
            .ToListAsync(cancellationToken);

        var days = Enumerable.Range(0, (to.Date - from.Date).Days + 1);
        var countByDay = rows.ToDictionary(x => x.Day, x => x.Count);
        return days.Select(offset => countByDay.GetValueOrDefault(from.Date.AddDays(offset))).ToList();
    }

    public async Task<IReadOnlyDictionary<string, long>> GetLatestTwoWeekPlaytimePerMemberAsync(DateTime asOf,
        CancellationToken cancellationToken)
    {
        // Для каждого участника берём самый свежий снапшот playtime (за 2 недели) на момент asOf.
        var rows = await _dbContext.PlaytimeSnapshots
            .Where(x => x.Timestamp <= asOf)
            .GroupBy(x => x.SteamId64)
            .Select(g => new
            {
                SteamId64 = g.Key,
                Minutes = g.OrderByDescending(x => x.Timestamp).First().MinutesLastTwoWeeks
            })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(x => x.SteamId64, x => x.Minutes);
    }
}