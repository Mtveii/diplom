using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Caching;

/// <summary>
/// Кэш поверх IDistributedCache (Redis). Если Redis недоступен — тихо работает без кэша,
/// чтобы панель оставалась функциональной в режиме без внешних зависимостей.
/// При недоступности Redis операции кэша отключаются на 60 секунд, чтобы не ждать таймауты
/// на каждой странице каталога.
/// </summary>
public sealed class RedisCacheService : ICacheService
{
    private static readonly TimeSpan DisablePeriod = TimeSpan.FromSeconds(60);

    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisCacheService> _logger;
    private readonly object _lock = new();

    private bool _enabled = true;
    private DateTime _retryAtUtc = DateTime.MinValue;

    public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        if (IsDisabled())
        {
            return default;
        }

        try
        {
            var bytes = await _cache.GetAsync(key, cancellationToken);
            Enable();
            if (bytes is null)
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(bytes);
        }
        catch (Exception ex)
        {
            Disable();
            _logger.LogWarning(ex, "Redis недоступен при чтении ключа {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null,
        CancellationToken cancellationToken = default)
    {
        if (IsDisabled())
        {
            return;
        }

        try
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl ?? TimeSpan.FromMinutes(10)
            };

            await _cache.SetAsync(key, JsonSerializer.SerializeToUtf8Bytes(value), options, cancellationToken);
            Enable();
        }
        catch (Exception ex)
        {
            Disable();
            _logger.LogWarning(ex, "Redis недоступен при записи ключа {Key}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        if (IsDisabled())
        {
            return;
        }

        try
        {
            await _cache.RemoveAsync(key, cancellationToken);
            Enable();
        }
        catch (Exception ex)
        {
            Disable();
            _logger.LogWarning(ex, "Redis недоступен при удалении ключа {Key}", key);
        }
    }

    private bool IsDisabled()
    {
        lock (_lock)
        {
            return !_enabled && DateTime.UtcNow < _retryAtUtc;
        }
    }

    private void Enable()
    {
        lock (_lock)
        {
            if (_enabled)
            {
                return;
            }

            _enabled = true;
            _logger.LogInformation("Redis снова доступен, кэш включён");
        }
    }

    private void Disable()
    {
        lock (_lock)
        {
            if (!_enabled)
            {
                return;
            }

            _enabled = false;
            _retryAtUtc = DateTime.UtcNow + DisablePeriod;
            _logger.LogWarning("Redis недоступен — операции кэша приостановлены на {Seconds} секунд",
                DisablePeriod.TotalSeconds);
        }
    }
}