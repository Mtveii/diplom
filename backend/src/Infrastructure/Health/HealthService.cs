using System.Diagnostics;
using System.Reflection;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using SteamAdminPanel.Application.Contracts.Health;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Infrastructure.Persistence;

namespace SteamAdminPanel.Infrastructure.Health;

public sealed class HealthService : IHealthService
{
    private readonly AppDbContext _dbContext;
    private readonly IDistributedCache _cache;

    public HealthService(AppDbContext dbContext, IDistributedCache cache)
    {
        _dbContext = dbContext;
        _cache = cache;
    }

    public async Task<SystemHealthDto> GetHealthAsync(CancellationToken cancellationToken = default)
    {
        var components = new List<HealthComponentDto>
        {
            await CheckDatabaseAsync(cancellationToken),
            await CheckRedisAsync(cancellationToken),
            CheckHangfire(),
        };

        return new SystemHealthDto(
            Status: components.All(component => component.Healthy) ? "Healthy" : "Degraded",
            TimestampUtc: DateTime.UtcNow,
            Uptime: DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime(),
            Version: Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "unknown",
            Components: components);
    }

    private async Task<HealthComponentDto> CheckDatabaseAsync(CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
            return new HealthComponentDto("Database", true, "PostgreSQL доступна", stopwatch.ElapsedMilliseconds);
        }
        catch (Exception exception)
        {
            return new HealthComponentDto("Database", false, exception.Message, stopwatch.ElapsedMilliseconds);
        }
    }

    private async Task<HealthComponentDto> CheckRedisAsync(CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            await _cache.GetAsync("health:probe", cancellationToken);
            return new HealthComponentDto("Redis", true, "Кэш доступен", stopwatch.ElapsedMilliseconds);
        }
        catch (Exception exception)
        {
            return new HealthComponentDto("Redis", false, exception.Message, stopwatch.ElapsedMilliseconds);
        }
    }

    private static HealthComponentDto CheckHangfire()
    {
        var storage = JobStorage.Current;
        if (storage == null)
        {
            return new HealthComponentDto("Hangfire", false, "Джобы выключены (Hangfire:Enabled=false)", null);
        }

        try
        {
            var monitoringApi = storage.GetMonitoringApi();
            var servers = monitoringApi.Servers()?.Count ?? 0;
            return new HealthComponentDto(
                "Hangfire",
                true,
                $"серверов: {servers}, активен",
                null);
        }
        catch (Exception exception)
        {
            return new HealthComponentDto("Hangfire", false, exception.Message, null);
        }
    }
}