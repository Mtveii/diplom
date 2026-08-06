using System.Text.Json;
using SteamAdminPanel.Application.Contracts.Steam;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using Microsoft.Extensions.Logging;

namespace SteamAdminPanel.Application.Services;

public sealed class SteamService : ISteamService
{
    private const string AppListCacheKey = "steam:applist";

    private readonly ISteamApiClient _steamApi;
    private readonly ICacheService _cache;
    private readonly ILogger<SteamService> _logger;

    public SteamService(ISteamApiClient steamApi, ICacheService cache, ILogger<SteamService> logger)
    {
        _steamApi = steamApi;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IReadOnlyList<SteamPlayerSummaryDto>> GetPlayerSummariesAsync(IEnumerable<string> steamIds,
        CancellationToken cancellationToken)
    {
        return await ResolveAsync(
            () => _steamApi.GetPlayerSummariesAsync(steamIds, cancellationToken),
            Array.Empty<SteamPlayerSummaryDto>(),
            cancellationToken);
    }

    public async Task<IReadOnlyList<OwnedGameDto>> GetOwnedGamesAsync(string steamId,
        CancellationToken cancellationToken)
    {
        return await ResolveAsync(
            () => _steamApi.GetOwnedGamesAsync(steamId, cancellationToken),
            Array.Empty<OwnedGameDto>(),
            cancellationToken);
    }

    public async Task<IReadOnlyList<SteamNewsItemDto>> GetNewsAsync(uint appId, CancellationToken cancellationToken)
    {
        return await ResolveAsync(
            () => _steamApi.GetNewsForAppAsync(appId, 10, cancellationToken),
            Array.Empty<SteamNewsItemDto>(),
            cancellationToken);
    }

    public async Task<IReadOnlyList<(uint AppId, string Name)>> SearchGamesAsync(string query, int limit,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Array.Empty<(uint, string)>();
        }

        var appList = await _cache.GetAsync<IReadOnlyList<(uint AppId, string Name)>>(AppListCacheKey,
            cancellationToken);
        if (appList is null)
        {
            appList = await ResolveAsync(
                () => _steamApi.GetAppListAsync(cancellationToken),
                Array.Empty<(uint, string)>(),
                cancellationToken);
            await _cache.SetAsync(AppListCacheKey, appList, TimeSpan.FromHours(24), cancellationToken);
            _logger.LogInformation("Кэш Steam AppList заполнен: {Count} игр", appList.Count);
        }

        return appList
            .Where(x => x.Name.Contains(query, StringComparison.OrdinalIgnoreCase))
            .Take(limit)
            .ToList();
    }

    public async Task<IReadOnlyList<AchievementPercentDto>> GetGlobalAchievementsAsync(uint appId,
        CancellationToken cancellationToken)
    {
        return await ResolveAsync(
            () => _steamApi.GetGlobalAchievementPercentagesAsync(appId, cancellationToken),
            Array.Empty<AchievementPercentDto>(),
            cancellationToken);
    }

    /// <summary>
    /// Steam Web API без ключа или при rate-limit отвечает 403/429 — не падаем,
    /// возвращаем пустые данные (панель остаётся рабочей).
    /// </summary>
    private async Task<T> ResolveAsync<T>(Func<Task<T>> action, T fallback, CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning("Steam API недоступен ({StatusCode}): {Message}", ex.StatusCode, ex.Message);
            return fallback;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return fallback;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Steam API вернул некорректный JSON");
            return fallback;
        }
    }
}