using System.Text.Json;
using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Steam;

/// <summary>
/// HTTP-клиент к Epic Games Store: только активные бесплатные раздачи
/// (store-site-backend-static.ak.epicgames.com/freeGamesPromotions, ~10-15 игр).
/// </summary>
public sealed class EpicGamesClient : IEpicGamesClient
{
    private const string FreeGamesUrl =
        "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions";

    private readonly HttpClient _httpClient;
    private readonly ILogger<EpicGamesClient> _logger;

    public EpicGamesClient(HttpClient httpClient, ILogger<EpicGamesClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<IReadOnlyList<EpicGameDto>> GetFreeGamesAsync(CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(FreeGamesUrl, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Epic вернул {StatusCode} для freeGamesPromotions", response.StatusCode);
            throw new HttpRequestException($"Epic вернул {(int)response.StatusCode}");
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        if (!TryGetElements(document.RootElement, out var elements))
        {
            return Array.Empty<EpicGameDto>();
        }

        var result = new List<EpicGameDto>();
        foreach (var element in elements)
        {
            result.Add(ReadGame(element));
        }

        return result;
    }

    private static bool TryGetElements(JsonElement root, out JsonElement.ArrayEnumerator elements)
    {
        elements = default;
        if (!root.TryGetProperty("data", out var data) ||
            !data.TryGetProperty("Catalog", out var catalog) ||
            !catalog.TryGetProperty("searchStore", out var store) ||
            !store.TryGetProperty("elements", out var array) ||
            array.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        elements = array.EnumerateArray();
        return true;
    }

    private static EpicGameDto ReadGame(JsonElement element)
    {
        var price = element.TryGetProperty("price", out var priceElement)
            ? priceElement
            : default;
        var totalPrice = price.TryGetProperty("totalPrice", out var totalPriceElement)
            ? totalPriceElement
            : default;

        var image = GetImage(element);
        var developerName = GetCustomAttribute(element, "developerName");

        return new EpicGameDto(
            GetString(element, "id") ?? string.Empty,
            GetString(element, "title") ?? string.Empty,
            GetString(element, "description"),
            GetDateTime(element, "effectiveDate"),
            GetNestedString(totalPrice, "fmtPrice", "originalPrice"),
            GetNestedDecimal(totalPrice, "discountPrice"),
            image,
            GetNestedString(element, "seller", "name"),
            developerName);
    }

    private static string? GetImage(JsonElement element)
    {
        if (!element.TryGetProperty("keyImages", out var images) || images.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var image in images.EnumerateArray())
        {
            var type = GetString(image, "type");
            if (type is "OfferImageWide" or "Thumbnail" or "DieselGameBoxTall" or "DieselGameBoxWide")
            {
                var url = GetString(image, "url");
                if (!string.IsNullOrWhiteSpace(url))
                {
                    return url;
                }
            }
        }

        return null;
    }

    private static string? GetCustomAttribute(JsonElement element, string wantedKey)
    {
        if (!element.TryGetProperty("customAttributes", out var attributes) ||
            attributes.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var attribute in attributes.EnumerateArray())
        {
            if (GetString(attribute, "key") == wantedKey)
            {
                return GetString(attribute, "value");
            }
        }

        return null;
    }

    private static DateTime? GetDateTime(JsonElement element, string name)
    {
        var raw = GetString(element, name);
        return DateTime.TryParse(raw, out var parsed) ? parsed : null;
    }

    private static string? GetNestedString(JsonElement element, string section, string name)
    {
        if (element.ValueKind == JsonValueKind.Undefined)
        {
            return null;
        }

        if (!element.TryGetProperty(section, out var sectionElement) ||
            !sectionElement.TryGetProperty(name, out var value) ||
            value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        return value.GetString();
    }

    private static decimal? GetNestedDecimal(JsonElement element, string name)
    {
        if (element.ValueKind == JsonValueKind.Undefined)
        {
            return null;
        }

        if (!element.TryGetProperty(name, out var value))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number)
        {
            return value.GetDecimal();
        }

        if (value.ValueKind == JsonValueKind.String &&
            int.TryParse(value.GetString(), System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        return null;
    }

    private static string? GetString(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }
}
