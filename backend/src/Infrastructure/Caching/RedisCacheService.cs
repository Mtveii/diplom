using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Caching;

/// <summary>
/// Кэш поверх IDistributedCache (Redis). Если Redis недоступен — тихо работает без кэша,
/// чтобы панель оставалась функциональной в режиме без внешних зависимостей.
/// </summary>
public sealed class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var bytes = await _cache.GetAsync(key, cancellationToken);
            if (bytes is null)
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(bytes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis недоступен при чтении ключа {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl ?? TimeSpan.FromMinutes(10)
            };

            await _cache.SetAsync(key, JsonSerializer.SerializeToUtf8Bytes(value), options, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis недоступен при записи ключа {Key}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await _cache.RemoveAsync(key, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis недоступен при удалении ключа {Key}", key);
        }
    }
}