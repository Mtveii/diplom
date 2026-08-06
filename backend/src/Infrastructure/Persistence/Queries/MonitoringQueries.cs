using Microsoft.EntityFrameworkCore;
using SteamAdminPanel.Application.Contracts.Monitoring;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence.Queries;

public sealed class MonitoringQueries : IMonitoringQueries
{
    private readonly AppDbContext _dbContext;

    public MonitoringQueries(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ActivityPointDto>> GetActivitySeriesAsync(DateTime from,
        CancellationToken cancellationToken)
    {
        // Агрегация по часу: количество уникальных игроков онлайн в каждом интервале.
        var points = await _dbContext.PlayerStatusSnapshots
            .Where(x => x.Timestamp >= from && x.IsOnline)
            .GroupBy(x => new DateTime(x.Timestamp.Year, x.Timestamp.Month, x.Timestamp.Day, x.Timestamp.Hour, 0, 0))
            .Select(g => new
            {
                Bucket = g.Key,
                Online = g.Select(x => x.SteamId64).Distinct().Count()
            })
            .ToListAsync(cancellationToken);

        return points
            .OrderBy(x => x.Bucket)
            .Select(x => new ActivityPointDto(x.Bucket, x.Online))
            .ToList();
    }

    public async Task<IReadOnlyList<HeatmapPointDto>> GetHeatmapAsync(DateTime from,
        CancellationToken cancellationToken)
    {
        var points = await _dbContext.PlayerStatusSnapshots
            .Where(x => x.Timestamp >= from && x.IsOnline)
            .GroupBy(x => new { x.Timestamp.DayOfWeek, x.Timestamp.Hour })
            .Select(g => new
            {
                g.Key.DayOfWeek,
                g.Key.Hour,
                Online = g.Select(x => x.SteamId64).Distinct().Count()
            })
            .ToListAsync(cancellationToken);

        return points
            .Select(x => new HeatmapPointDto((int)x.DayOfWeek, x.Hour, x.Online))
            .ToList();
    }

    public async Task<IReadOnlyList<TopPlayerDto>> GetTopPlayersAsync(DateTime from, int limit,
        CancellationToken cancellationToken)
    {
        // Суммируем последний "playtime за 2 недели" по каждой игре участника в периоде.
        var rows = await _dbContext.PlaytimeSnapshots
            .Where(x => x.Timestamp >= from)
            .GroupBy(x => x.SteamId64)
            .Select(g => new
            {
                SteamId64 = g.Key,
                Minutes = g.Sum(x => x.MinutesLastTwoWeeks)
            })
            .OrderByDescending(x => x.Minutes)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return rows
            .Where(x => x.Minutes > 0)
            .Select(x => new TopPlayerDto(x.SteamId64, string.Empty, x.Minutes, x.Minutes / 60.0))
            .ToList();
    }

    public async Task<IReadOnlyList<string>> GetDistinctOnlineSteamIdsAsync(DateTime from, DateTime to,
        CancellationToken cancellationToken)
    {
        return await _dbContext.PlayerStatusSnapshots
            .Where(x => x.Timestamp >= from && x.Timestamp <= to && x.IsOnline)
            .Select(x => x.SteamId64)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<DateTime, int>> GetDailyOnlineCountsAsync(DateTime from, DateTime to,
        CancellationToken cancellationToken)
    {
        var rows = await _dbContext.PlayerStatusSnapshots
            .Where(x => x.Timestamp >= from && x.Timestamp <= to && x.IsOnline)
            .GroupBy(x => x.Timestamp.Date)
            .Select(g => new
            {
                Day = g.Key,
                Online = g.Select(x => x.SteamId64).Distinct().Count()
            })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(x => x.Day, x => x.Online);
    }

    public async Task<DateTime?> GetLastOnlineAsync(string steamId64, CancellationToken cancellationToken)
    {
        return await _dbContext.PlayerStatusSnapshots
            .Where(x => x.SteamId64 == steamId64 && x.IsOnline)
            .OrderByDescending(x => x.Timestamp)
            .Select(x => (DateTime?)x.Timestamp)
            .FirstOrDefaultAsync(cancellationToken);
    }
}