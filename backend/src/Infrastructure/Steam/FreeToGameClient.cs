using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Infrastructure.Options;

namespace SteamAdminPanel.Infrastructure.Steam;

/// <summary>
/// HTTP-клиент к бесплатному каталогу FreeToGame (работает без ключа).
/// </summary>
public sealed class FreeToGameClient : IFreeToGameClient
{
    private readonly HttpClient _httpClient;
    private readonly FreeToGameOptions _options;
    private readonly ILogger<FreeToGameClient> _logger;

    public FreeToGameClient(HttpClient httpClient, IOptions<FreeToGameOptions> options,
        ILogger<FreeToGameClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<FreeToGameGameDto>> GetGamesAsync(CancellationToken cancellationToken)
    {
        var url = $"{_options.BaseUrl}/api/games";
        using var document = await ReadJsonAsync(url, cancellationToken);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<FreeToGameGameDto>();
        }

        return document.RootElement.EnumerateArray()
            .Select(x => new FreeToGameGameDto(
                x.GetProperty("id").GetInt32(),
                x.GetProperty("title").GetString() ?? string.Empty,
                GetString(x, "thumbnail"),
                GetString(x, "short_description"),
                GetString(x, "genre"),
                GetString(x, "platform"),
                GetString(x, "publisher"),
                GetString(x, "developer"),
                GetString(x, "release_date")))
            .Where(x => !string.IsNullOrWhiteSpace(x.Title))
            .ToList();
    }

    public async Task<FreeToGameGameDetailDto?> GetGameByIdAsync(int id, CancellationToken cancellationToken)
    {
        var url = $"{_options.BaseUrl}/api/game?id={id}";
        using var document = await ReadJsonAsync(url, cancellationToken);
        if (document.RootElement.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var screenshots = new List<string>();
        if (document.RootElement.TryGetProperty("screenshots", out var shots) &&
            shots.ValueKind == JsonValueKind.Array)
        {
            screenshots.AddRange(shots.EnumerateArray()
                .Select(x => GetString(x, "image"))
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!));
        }

        return new FreeToGameGameDetailDto(
            id,
            GetString(document.RootElement, "title") ?? $"App {id}",
            GetString(document.RootElement, "thumbnail"),
            GetString(document.RootElement, "short_description"),
            GetString(document.RootElement, "description"),
            GetString(document.RootElement, "genre"),
            GetString(document.RootElement, "platform"),
            GetString(document.RootElement, "publisher"),
            GetString(document.RootElement, "developer"),
            GetString(document.RootElement, "release_date"),
            GetMinimumRequirements(document.RootElement),
            screenshots);
    }

    private static string? GetMinimumRequirements(JsonElement root)
    {
        if (!root.TryGetProperty("minimum_system_requirements", out var requirements) ||
            requirements.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var parts = new List<string>();
        foreach (var name in new[] { "os", "processor", "memory", "graphics", "storage" })
        {
            var value = GetString(requirements, name);
            if (!string.IsNullOrWhiteSpace(value))
            {
                parts.Add($"{name}: {value}");
            }
        }

        return parts.Count == 0 ? null : string.Join("\n", parts);
    }

    private async Task<JsonDocument> ReadJsonAsync(string url, CancellationToken cancellationToken)
    {
        var response = await _httpClient.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("FreeToGame вернул {StatusCode} для {Url}", response.StatusCode, url);
            throw new HttpRequestException($"FreeToGame вернул {(int)response.StatusCode}");
        }

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
    }

    private static string? GetString(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }
}