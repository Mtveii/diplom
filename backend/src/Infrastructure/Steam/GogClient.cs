using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Steam;

/// <summary>
/// HTTP-клиент к каталогу GOG (https://www.gog.com/games/ajax/filtered).
/// Вызывается с сервера, чтобы обойти CORS (из браузера нельзя). 40 игр на страницу.
/// </summary>
public sealed class GogClient : IGogClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GogClient> _logger;

    public GogClient(HttpClient httpClient, ILogger<GogClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    private static readonly Regex ProductCardDescriptionRegex = new(
        "<div class=\"description\"[^>]*>(?<body>.*?)</div>",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex SystemRequirementsRegex = new(
        "content-summary-item__title\">\\s*System requirements\\s*" +
        "<svg[^>]*>.*?</svg></div>\\s*<div class=\"content-summary-item__description\">(?<body>.*?)</div>",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex HtmlTagRegex = new("<[^>]+>", RegexOptions.Compiled);

    public async Task<GogPageDto> GetPageAsync(int page, CancellationToken cancellationToken)
    {
        var url = $"https://www.gog.com/games/ajax/filtered?mediaType=game&page={page}&sort=popularity";
        using var response = await _httpClient.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("GOG вернул {StatusCode} для страницы {Page}", response.StatusCode, page);
            throw new HttpRequestException($"GOG вернул {(int)response.StatusCode}");
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var root = document.RootElement;

        var totalPages = root.TryGetProperty("totalPages", out var p) && p.ValueKind == JsonValueKind.Number
            ? p.GetInt32()
            : 0;
        var totalResults = root.TryGetProperty("totalResults", out var r) && r.ValueKind == JsonValueKind.Number
            ? r.GetInt32()
            : 0;

        var products = new List<GogProductDto>();
        if (root.TryGetProperty("products", out var productsElement) &&
            productsElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var x in productsElement.EnumerateArray())
            {
                products.Add(Product(x));
            }
        }

        return new GogPageDto(page, totalPages, totalResults, products);
    }

    /// <summary>
    /// Скачивает страницу игры на GOG и извлекает описание и системные требования.
    /// Возвращает null, если страница недоступна или данные не найдены.
    /// </summary>
    public async Task<GogGameDetailsDto?> GetGameDetailsAsync(string gameUrl,
        CancellationToken cancellationToken = default)
    {
        using var response = await _httpClient.GetAsync(gameUrl, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("GOG страница {Url}: статус {StatusCode}", gameUrl, response.StatusCode);
            return null;
        }

        var html = await response.Content.ReadAsStringAsync(cancellationToken);

        var descriptionMatch = ProductCardDescriptionRegex.Match(html);
        var requirementsMatch = SystemRequirementsRegex.Match(html);

        var description = descriptionMatch.Success
            ? StripHtml(descriptionMatch.Groups["body"].Value)
            : null;
        var requirements = requirementsMatch.Success
            ? StripHtml(requirementsMatch.Groups["body"].Value)
            : null;

        if (description is null && requirements is null)
        {
            _logger.LogWarning("GOG страница {Url}: описание и требования не найдены", gameUrl);
            return null;
        }

        return new GogGameDetailsDto(
            string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            string.IsNullOrWhiteSpace(requirements) ? null : requirements.Trim());
    }

    /// <summary>Заменяет <br>/</p> на перенос строки, убирает остальные теги и HTML-сущности.</summary>
    private static string StripHtml(string html)
    {
        var withNewlines = html
            .Replace("<br", "\n<br", StringComparison.OrdinalIgnoreCase)
            .Replace("</p>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("</li>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("</h4>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("</h3>", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("</div>", "\n", StringComparison.OrdinalIgnoreCase);

        var withoutTags = HtmlTagRegex.Replace(withNewlines, string.Empty);
        return WebUtility.HtmlDecode(withoutTags);
    }

    private static GogProductDto Product(JsonElement x)
    {
        var price = x.TryGetProperty("price", out var priceElement)
            ? priceElement
            : default;

        return new GogProductDto(
            x.TryGetProperty("id", out var id) ? id.GetInt64() : 0,
            x.TryGetProperty("title", out var title) ? title.GetString() ?? string.Empty : string.Empty,
            FixImageUrl(GetString(x, "boxImage")),
            GetString(x, "developer"),
            GetString(x, "publisher"),
            GetStringArray(x, "genres"),
            GetBool(x, "worksOn", "Windows"),
            GetBool(x, "worksOn", "Mac"),
            GetBool(x, "worksOn", "Linux"),
            x.TryGetProperty("releaseDate", out var rel) && rel.ValueKind == JsonValueKind.Number
                ? rel.GetInt64()
                : null,
            GetString(x, "url"),
            GetPriceDecimal(price, "amount") ?? 0m,
            GetString(price, "currency"),
            GetPriceDecimal(price, "finalAmount") ?? 0m,
            GetBool(price, "isDiscounted"),
            GetPriceDecimal(price, "discountPercentage") ?? 0m,
            GetStringArray(x, "gallery").Select(FixImageUrl).ToList());
    }

    /// <summary>
    /// GOG отдаёт ссылки на изображения без расширения файла
    /// (например "//images-1.gog-statics.com/abc123") — сервер без него
    /// возвращает 404. Добавляем ".jpg", если расширение отсутствует.
    /// </summary>
    private static string? FixImageUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return url;
        }

        var hasExtension = url.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                           url.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                           url.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                           url.EndsWith(".webp", StringComparison.OrdinalIgnoreCase);
        return hasExtension ? url : $"{url}.jpg";
    }

    private static bool GetBool(JsonElement x, string name)
    {
        return x.ValueKind == JsonValueKind.Object &&
               x.TryGetProperty(name, out var value) &&
               value.ValueKind == JsonValueKind.True;
    }

    private static bool GetBool(JsonElement x, string section, string name)
    {
        return x.TryGetProperty(section, out var sectionElement) &&
               sectionElement.ValueKind == JsonValueKind.Object &&
               sectionElement.TryGetProperty(name, out var value) &&
               value.ValueKind == JsonValueKind.True;
    }

    private static decimal? GetPriceDecimal(JsonElement element, string name)
    {
        if (element.ValueKind == JsonValueKind.Undefined)
        {
            return null;
        }

        if (!element.TryGetProperty(name, out var value))
        {
            return null;
        }

        // GOG отдаёт цены то числом, то строкой ("2.69") — поддерживаем оба формата.
        if (value.ValueKind == JsonValueKind.Number)
        {
            return value.GetDecimal();
        }

        if (value.ValueKind == JsonValueKind.String &&
            decimal.TryParse(value.GetString(), System.Globalization.NumberStyles.Any,
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

    private static IReadOnlyList<string> GetStringArray(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        return value.EnumerateArray()
            .Where(x => x.ValueKind == JsonValueKind.String)
            .Select(x => x.GetString()!)
            .ToList();
    }
}