using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SteamAdminPanel.Application.Contracts.Steam;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Infrastructure.Options;

namespace SteamAdminPanel.Infrastructure.Steam;

/// <summary>
/// HTTP-клиент к публичному Steam Web API + store-страницам и SteamSpy для статистики игр.
/// Троттлинг: не более одного запроса к Steam раз в 400мс (общий лимит крупный, но держим запас).
/// </summary>
public sealed class SteamApiClient : ISteamApiClient
{
    private static readonly SemaphoreSlim Throttle = new(1, 1);
    private static DateTime _lastRequestAt = DateTime.MinValue;
    private static readonly TimeSpan MinRequestInterval = TimeSpan.FromMilliseconds(400);

    private readonly HttpClient _httpClient;
    private readonly SteamOptions _options;
    private readonly ILogger<SteamApiClient> _logger;

    public SteamApiClient(HttpClient httpClient, IOptions<SteamOptions> options,
        ILogger<SteamApiClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<SteamPlayerSummaryDto>> GetPlayerSummariesAsync(
        IEnumerable<string> steamIds, CancellationToken cancellationToken)
    {
        var ids = steamIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return Array.Empty<SteamPlayerSummaryDto>();
        }

        await ThrottleSteamAsync(cancellationToken);
        var url = $"{_options.WebApiBaseUrl}/ISteamUser/GetPlayerSummaries/v2/?key={_options.ApiKey}" +
                  $"&steamids={string.Join(',', ids)}";

        using var document = await ReadJsonAsync(url, cancellationToken);
        if (document.RootElement.TryGetProperty("response", out var response) &&
            response.TryGetProperty("players", out var players))
        {
            return players.EnumerateArray().Select(ParsePlayerSummary).ToList();
        }

        return Array.Empty<SteamPlayerSummaryDto>();
    }

    public async Task<IReadOnlyList<OwnedGameDto>> GetOwnedGamesAsync(string steamId,
        CancellationToken cancellationToken)
    {
        await ThrottleSteamAsync(cancellationToken);
        var url = $"{_options.WebApiBaseUrl}/IPlayerService/GetOwnedGames/v1/" +
                  $"?key={_options.ApiKey}&steamid={steamId}&include_appinfo=true&include_played_free_games=true";

        using var document = await ReadJsonAsync(url, cancellationToken);
        if (!document.RootElement.TryGetProperty("response", out var response) ||
            !response.TryGetProperty("games", out var games))
        {
            return Array.Empty<OwnedGameDto>();
        }

        var result = new List<OwnedGameDto>();
        foreach (var game in games.EnumerateArray())
        {
            result.Add(new OwnedGameDto(
                game.GetProperty("appid").GetUInt32(),
                GetStringProperty(game, "name") ?? $"App {game.GetProperty("appid").GetUInt32()}",
                GetInt64Property(game, "playtime_forever") ?? 0,
                GetInt64Property(game, "playtime_2weeks") ?? 0,
                GetIconUrl(game)));
        }

        return result;
    }

    public async Task<IReadOnlyList<AchievementPercentDto>> GetGlobalAchievementPercentagesAsync(uint appId,
        CancellationToken cancellationToken)
    {
        await ThrottleSteamAsync(cancellationToken);
        var url = $"{_options.WebApiBaseUrl}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid={appId}";

        using var document = await ReadJsonAsync(url, cancellationToken);
        if (!document.RootElement.TryGetProperty("achievementpercentages", out var percentages) ||
            !percentages.TryGetProperty("achievements", out var achievements))
        {
            return Array.Empty<AchievementPercentDto>();
        }

        return achievements.EnumerateArray()
            .Select(x => new AchievementPercentDto(
                x.GetProperty("name").GetString() ?? string.Empty,
                null,
                x.GetProperty("percent").GetDecimal()))
            .ToList();
    }

    public async Task<IReadOnlyList<SteamNewsItemDto>> GetNewsForAppAsync(uint appId, int count,
        CancellationToken cancellationToken)
    {
        await ThrottleSteamAsync(cancellationToken);
        var url = $"{_options.WebApiBaseUrl}/ISteamNews/GetNewsForApp/v2/" +
                  $"?appid={appId}&count={count}&maxlength=300";

        using var document = await ReadJsonAsync(url, cancellationToken);
        if (!document.RootElement.TryGetProperty("appnews", out var news) ||
            !news.TryGetProperty("newsitems", out var items))
        {
            return Array.Empty<SteamNewsItemDto>();
        }

        return items.EnumerateArray()
            .Select(x => new SteamNewsItemDto(
                GetInt64Property(x, "gid") ?? 0,
                GetStringProperty(x, "title"),
                GetStringProperty(x, "url"),
                GetStringProperty(x, "author"),
                TryGetDate(x),
                GetStringProperty(x, "feedlabel")))
            .ToList();
    }

    public async Task<IReadOnlyList<(uint AppId, string Name)>> GetAppListAsync(
        CancellationToken cancellationToken)
    {
        await ThrottleSteamAsync(cancellationToken);
        var url = $"{_options.WebApiBaseUrl}/ISteamApps/GetAppList/v2/";

        using var document = await ReadJsonAsync(url, cancellationToken);
        if (!document.RootElement.TryGetProperty("applist", out var appList) ||
            !appList.TryGetProperty("apps", out var apps))
        {
            return Array.Empty<(uint, string)>();
        }

        return apps.EnumerateArray()
            .Select(x => (x.GetProperty("appid").GetUInt32(), x.GetProperty("name").GetString() ?? string.Empty))
            .ToList();
    }

    public async Task<IReadOnlyList<string>> GetSteamGroupMemberIdsAsync(string groupId,
        CancellationToken cancellationToken)
    {
        var result = new List<string>();
        for (var page = 1; page <= 2; page++)
        {
            await ThrottleSteamAsync(cancellationToken);
            var url = $"https://steamcommunity.com/gid/{groupId}/memberslistxml/?xml=1&p={page}";

            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                if ((int)response.StatusCode == 429)
                {
                    _logger.LogWarning("Steam вернул 429 (rate limit) при запросе группы {GroupId}", groupId);
                }

                break;
            }

            var xml = await response.Content.ReadAsStringAsync(cancellationToken);
            var memberCount = ParseXmlMemberCount(xml) ?? 0;
            result.AddRange(ParseXmlMembers(xml));

            if (result.Count >= memberCount)
            {
                break;
            }
        }

        return result.Distinct().ToList();
    }

    public async Task<GameStatsDto?> GetGameStatsAsync(uint appId, CancellationToken cancellationToken)
    {
        var storeStats = await GetStoreStatsAsync(appId, cancellationToken);
        var steamSpyStats = await GetSteamSpyStatsAsync(appId, cancellationToken);

        if (storeStats is null && steamSpyStats is null)
        {
            return null;
        }

        return new GameStatsDto(
            storeStats?.Price ?? steamSpyStats?.Price,
            storeStats?.DiscountPercent,
            steamSpyStats?.PositiveReviewPercent,
            steamSpyStats?.TotalReviews,
            steamSpyStats?.OwnerCount);
    }

    public async Task<IReadOnlyList<PlayerAchievementDto>> GetPlayerAchievementsAsync(string steamId,
        uint appId, CancellationToken cancellationToken)
    {
        await ThrottleSteamAsync(cancellationToken);
        var url = $"{_options.WebApiBaseUrl}/ISteamUserStats/GetPlayerAchievements/v1/" +
                  $"?key={_options.ApiKey}&steamid={steamId}&appid={appId}";

        using var document = await ReadJsonAsync(url, cancellationToken);
        if (!document.RootElement.TryGetProperty("playerstats", out var stats) ||
            !stats.TryGetProperty("achievements", out var achievements))
        {
            return Array.Empty<PlayerAchievementDto>();
        }

        return achievements.EnumerateArray()
            .Select(x => new PlayerAchievementDto(
                x.GetProperty("apiname").GetString() ?? string.Empty,
                x.TryGetProperty("achieved", out _) && x.GetProperty("achieved").GetInt32() == 1))
            .ToList();
    }

    private async Task<(decimal? Price, decimal? DiscountPercent)?> GetStoreStatsAsync(uint appId,
        CancellationToken cancellationToken)
    {
        try
        {
            await ThrottleSteamAsync(cancellationToken);
            var url = $"{_options.StoreBaseUrl}/api/appdetails/?appids={appId}&cc=US";

            using var document = await ReadJsonAsync(url, cancellationToken);
            if (!document.RootElement.TryGetProperty(appId.ToString(), out var entry) ||
                !entry.TryGetProperty("success", out var success) || !success.GetBoolean())
            {
                return null;
            }

            if (!entry.TryGetProperty("data", out var data) ||
                !data.TryGetProperty("price_overview", out var priceOverview))
            {
                return (null, null);
            }

            var price = GetDecimalProperty(priceOverview, "final");
            var discount = GetDecimalProperty(priceOverview, "discount_percent");
            return price is null && discount is null ? null : (price, discount);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Не удалось получить store-данные для AppId {AppId}", appId);
            return null;
        }
    }

    private async Task<(decimal? PositiveReviewPercent, long? TotalReviews, decimal? OwnerCount, decimal? Price)?>
        GetSteamSpyStatsAsync(uint appId, CancellationToken cancellationToken)
    {
        JsonDocument? document = null;
        try
        {
            await ThrottleSteamAsync(cancellationToken);
            var url = $"{_options.SteamSpyBaseUrl}?request=appdetails&appid={appId}";
            document = await JsonDocument.ParseAsync(
                await _httpClient.GetStreamAsync(url, cancellationToken),
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SteamSpy недоступен для AppId {AppId}", appId);
            return null;
        }

        using var root = document ?? throw new InvalidOperationException();
        if (!root.RootElement.TryGetProperty(appId.ToString(), out var stats))
        {
            return null;
        }

        long? positive = GetInt64Property(stats, "positive");
        long? negative = GetInt64Property(stats, "negative");
        decimal? owners = GetDecimalProperty(stats, "owners_voted");

        long? totalReviews = positive.HasValue && negative.HasValue ? positive + negative : null;
        decimal? positivePercent = totalReviews is > 0
            ? (decimal)positive!.Value / totalReviews.Value * 100m
            : null;

        return (positivePercent, totalReviews, owners, Price: null);
    }

    private async Task<JsonDocument> ReadJsonAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            await ThrottleSteamAsync(cancellationToken);
            return await JsonDocument.ParseAsync(
                await _httpClient.GetStreamAsync(url, cancellationToken),
                cancellationToken: cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Ошибка запроса к Steam: {Url}", url);
            throw;
        }
    }

    private async Task ThrottleSteamAsync(CancellationToken cancellationToken)
    {
        await Throttle.WaitAsync(cancellationToken);
        try
        {
            var waitUntil = _lastRequestAt.Add(MinRequestInterval);
            if (waitUntil > DateTime.UtcNow)
            {
                await Task.Delay(waitUntil - DateTime.UtcNow, cancellationToken);
            }

            _lastRequestAt = DateTime.UtcNow;
        }
        finally
        {
            Throttle.Release();
        }
    }

    private static SteamPlayerSummaryDto ParsePlayerSummary(JsonElement player)
    {
        var personaState = GetInt32Property(player, "personastate") ?? 0;
        var gameId = GetStringProperty(player, "gameid");

        return new SteamPlayerSummaryDto(
            player.GetProperty("steamid").GetString() ?? string.Empty,
            GetStringProperty(player, "personaname"),
            GetStringProperty(player, "avatar"),
            GetStringProperty(player, "avatarmedium"),
            GetStringProperty(player, "avatarfull"),
            personaState,
            gameId,
            GetStringProperty(player, "gameextrainfo"),
            UnixToDateTime(GetInt64Property(player, "lastlogoff")),
            UnixToDateTime(GetInt64Property(player, "lastlogoff")),
            true);
    }

    private static string? GetIconUrl(JsonElement game)
    {
        if (!game.TryGetProperty("img_icon_url", out var icon))
        {
            return null;
        }

        return $"https://media.steampowered.com/steamcommunity/public/images/apps/" +
               $"{game.GetProperty("appid").GetUInt32()}/{icon.GetString()}.jpg";
    }

    private static DateTime? UnixToDateTime(long? unixSeconds)
    {
        if (unixSeconds is null or 0)
        {
            return null;
        }

        return DateTimeOffset.FromUnixTimeSeconds(unixSeconds.Value).UtcDateTime;
    }

    private static string? GetStringProperty(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private static long? GetInt64Property(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetInt64()
            : null;
    }

    private static int? GetInt32Property(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetInt32()
            : null;
    }

    private static decimal? GetDecimalProperty(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetDecimal()
            : null;
    }

    private static DateTime? TryGetDate(JsonElement element)
    {
        var unix = GetInt64Property(element, "date");
        return UnixToDateTime(unix);
    }

    private static IReadOnlyList<string> ParseXmlMembers(string xml)
    {
        var members = new List<string>();
        string token = "<steamID64>";
        var index = 0;
        while (xml.IndexOf(token, index, StringComparison.Ordinal) is var start && start >= 0)
        {
            var endTag = "</steamID64>";
            var end = xml.IndexOf(endTag, start, StringComparison.Ordinal);
            if (end < 0)
            {
                break;
            }

            var value = xml.Substring(start + token.Length, end - start - token.Length);
            if (value.Length == 17 && value.All(char.IsDigit))
            {
                members.Add(value);
            }

            index = end + endTag.Length;
        }

        return members;
    }

    private static int? ParseXmlMemberCount(string xml)
    {
        const string token = "<memberCount>";
        var start = xml.IndexOf(token, StringComparison.Ordinal);
        if (start < 0)
        {
            return null;
        }

        var end = xml.IndexOf("</memberCount>", start, StringComparison.Ordinal);
        if (end < 0)
        {
            return null;
        }

        return int.TryParse(xml.Substring(start + token.Length, end - start - token.Length), out var count)
            ? count
            : null;
    }
}