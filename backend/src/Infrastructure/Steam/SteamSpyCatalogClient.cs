using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Infrastructure.Options;

namespace SteamAdminPanel.Infrastructure.Steam;

/// <summary>
/// HTTP-клиент к SteamSpy (работает без ключа): полный срез каталога Steam (request=all).
/// Ответ большой (~130 тыс. записей), поэтому таймаут увеличен.
/// </summary>
public sealed class SteamSpyCatalogClient : ISteamSpyCatalogClient
{
    private readonly HttpClient _httpClient;
    private readonly SteamOptions _options;
    private readonly ILogger<SteamSpyCatalogClient> _logger;

    public SteamSpyCatalogClient(HttpClient httpClient, IOptions<SteamOptions> options,
        ILogger<SteamSpyCatalogClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<SteamSpyCatalogEntryDto>> GetCatalogAsync(CancellationToken cancellationToken)
    {
        var url = $"{_options.SteamSpyBaseUrl}?request=all";
        var response = await _httpClient.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("SteamSpy вернул {StatusCode} для {Url}", response.StatusCode, url);
            throw new HttpRequestException($"SteamSpy вернул {(int)response.StatusCode}");
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        if (document.RootElement.ValueKind != JsonValueKind.Object)
        {
            return Array.Empty<SteamSpyCatalogEntryDto>();
        }

        var result = new List<SteamSpyCatalogEntryDto>();
        foreach (var property in document.RootElement.EnumerateObject())
        {
            if (!uint.TryParse(property.Name, out var appId) ||
                property.Value.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            result.Add(new SteamSpyCatalogEntryDto(
                appId,
                GetString(property.Value, "name") ?? $"App {appId}",
                GetString(property.Value, "developer"),
                GetString(property.Value, "publisher"),
                GetInt64(property.Value, "positive") ?? 0,
                GetInt64(property.Value, "negative") ?? 0,
                GetString(property.Value, "owners"),
                GetPrice(property.Value, "price"),
                GetPrice(property.Value, "initialprice"),
                GetDecimal(property.Value, "discount"),
                GetInt64(property.Value, "ccu") ?? 0));
        }

        return result;
    }

    private static decimal? GetPrice(JsonElement element, string name)
    {
        var raw = GetString(element, name);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var price)
            ? price
            : null;
    }

    private static string? GetString(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private static long? GetInt64(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetInt64()
            : null;
    }

    private static decimal? GetDecimal(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetDecimal()
            : null;
    }
}