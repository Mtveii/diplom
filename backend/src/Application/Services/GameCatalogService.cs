using System.Text.Json;
using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Exceptions;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Application.Services;

/// <summary>
/// Каталог игр: источник — FreeToGame (413 игр), обогащение — SteamSpy (топ-1000 по онлайну).
/// Игры FreeToGame показываются всегда; при совпадении по названию на карточку
/// добавляются SteamSpy-поля, иначе — заглушки «нет данных».
/// </summary>
public sealed class GameCatalogService : IGameCatalogService
{
    private const int SteamSpyTopCount = 1000;

    private static readonly string[] VersionSuffixes =
    {
        "special edition", "game of the year edition", "game of the year", "goty edition", "goty",
        "deluxe edition", "deluxe", "ultimate edition", "ultimate", "definitive edition", "definitive",
        "complete edition", "complete", "collector's edition", "collectors edition", "collector edition",
        "anniversary edition", "anniversary", "enhanced edition", "enhanced", "remastered", "remaster",
        "remake", "legacy", "classic", "hd", "se",
    };

    private readonly IFreeToGameClient _freeToGame;
    private readonly ISteamSpyCatalogClient _steamSpy;
    private readonly ILogger<GameCatalogService> _logger;

    public GameCatalogService(IFreeToGameClient freeToGame, ISteamSpyCatalogClient steamSpy,
        ILogger<GameCatalogService> logger)
    {
        _freeToGame = freeToGame;
        _steamSpy = steamSpy;
        _logger = logger;
    }

    public async Task<IReadOnlyList<CatalogListItemDto>> GetCatalogAsync(CancellationToken cancellationToken)
    {
        var games = await ResolveAsync(() => _freeToGame.GetGamesAsync(cancellationToken),
            Array.Empty<FreeToGameGameDto>(), cancellationToken);
        var steamSpyPool = await LoadSteamSpyPoolAsync(cancellationToken);

        var items = games
            .Select(game => Merge(game, steamSpyPool))
            .OrderByDescending(x => x.Ccu ?? -1)
            .ThenBy(x => x.Title, StringComparer.OrdinalIgnoreCase)
            .ToList();

        _logger.LogInformation("Каталог игр: {Total} игр, из них {Matched} обогащены SteamSpy", items.Count,
            items.Count(x => x.MatchKind == CatalogMatchKind.MatchedWithSteamSpy));
        return items;
    }

    public async Task<CatalogGameDetailDto> GetGameByIdAsync(int id, CancellationToken cancellationToken)
    {
        var detail = await ResolveAsync(() => _freeToGame.GetGameByIdAsync(id, cancellationToken),
            null, cancellationToken);
        if (detail is null)
        {
            throw new NotFoundException($"Игра с id {id} не найдена в FreeToGame");
        }

        var steamSpyPool = await LoadSteamSpyPoolAsync(cancellationToken);
        var game = Merge(
            new FreeToGameGameDto(detail.Id, detail.Title, detail.Thumbnail, detail.ShortDescription,
                detail.Genre, detail.Platform, detail.Publisher, detail.Developer, detail.ReleaseDate),
            steamSpyPool);

        var matchedSpy = game.MatchKind == CatalogMatchKind.MatchedWithSteamSpy &&
                         steamSpyPool.TryGetValue(Normalize(detail.Title), out var spy)
            ? spy
            : null;

        return new CatalogGameDetailDto(
            game, detail.Description, detail.MinimumRequirements, detail.Screenshots,
            matchedSpy?.AppId, matchedSpy?.Name);
    }

    private async Task<IReadOnlyDictionary<string, SteamSpyCatalogEntryDto>> LoadSteamSpyPoolAsync(
        CancellationToken cancellationToken)
    {
        var catalog = await ResolveAsync(() => _steamSpy.GetCatalogAsync(cancellationToken),
            Array.Empty<SteamSpyCatalogEntryDto>(), cancellationToken);
        if (catalog.Count == 0)
        {
            return new Dictionary<string, SteamSpyCatalogEntryDto>();
        }

        // Топ-1000 по текущему онлайну (ccu); при дублях названий берём запись с большим ccu.
        var pool = new Dictionary<string, SteamSpyCatalogEntryDto>(StringComparer.Ordinal);
        foreach (var entry in catalog.OrderByDescending(x => x.Ccu).Take(SteamSpyTopCount))
        {
            pool.TryAdd(Normalize(entry.Name), entry);
        }

        return pool;
    }

    private static CatalogListItemDto Merge(FreeToGameGameDto game,
        IReadOnlyDictionary<string, SteamSpyCatalogEntryDto> steamSpyPool)
    {
        if (steamSpyPool.TryGetValue(Normalize(game.Title), out var spy))
        {
            var totalReviews = spy.Positive + spy.Negative;
            decimal? positivePercent = totalReviews > 0
                ? (decimal)spy.Positive / totalReviews * 100m
                : null;

            return new CatalogListItemDto(
                game.Id, game.Title, game.Thumbnail, game.ShortDescription, game.Genre, game.Platform,
                game.Publisher, game.Developer, game.ReleaseDate,
                CatalogMatchKind.MatchedWithSteamSpy,
                spy.AppId, spy.Ccu, spy.Owners, positivePercent, spy.Price, spy.DiscountPercent);
        }

        return new CatalogListItemDto(
            game.Id, game.Title, game.Thumbnail, game.ShortDescription, game.Genre, game.Platform,
            game.Publisher, game.Developer, game.ReleaseDate,
            CatalogMatchKind.FreeToGameOnly,
            null, null, null, null, null, null);
    }

    /// <summary>
    /// Нормализация названия для сравнения: нижний регистр, без пунктуации,
    /// срез версионных суффиксов (SE/GOTY/Remastered/Legacy/год).
    /// </summary>
    public static string Normalize(string title)
    {
        var lowered = title.ToLowerInvariant();
        var builder = new System.Text.StringBuilder(lowered.Length);
        var pendingSpace = false;
        foreach (var ch in lowered)
        {
            if (char.IsLetterOrDigit(ch))
            {
                if (pendingSpace && builder.Length > 0)
                {
                    builder.Append(' ');
                }

                pendingSpace = false;
                builder.Append(ch);
            }
            else
            {
                pendingSpace = true;
            }
        }

        var normalized = builder.ToString().Trim();
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var suffix in VersionSuffixes)
            {
                if (TryStripSuffix(ref normalized, suffix))
                {
                    changed = true;
                }
            }

            if (TryStripTrailingYear(ref normalized))
            {
                changed = true;
            }
        }

        return normalized;
    }

    private static bool TryStripSuffix(ref string value, string suffix)
    {
        if (value.Length <= suffix.Length || !value.EndsWith(suffix, StringComparison.Ordinal))
        {
            return false;
        }

        var prefixLength = value.Length - suffix.Length;
        if (prefixLength > 0 && value[prefixLength - 1] != ' ')
        {
            return false;
        }

        value = value[..prefixLength].TrimEnd();
        return true;
    }

    private static bool TryStripTrailingYear(ref string value)
    {
        if (value.Length < 4)
        {
            return false;
        }

        var lastToken = value[(value.LastIndexOf(' ') + 1)..];
        if (lastToken.Length == 4 && lastToken.All(char.IsDigit))
        {
            value = value[..^lastToken.Length].TrimEnd();
            return true;
        }

        return false;
    }

    /// <summary>
    /// Внешние источники не должны ронять страницу: при недоступности падаем в fallback.
    /// </summary>
    private async Task<T> ResolveAsync<T>(Func<Task<T>> action, T fallback, CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning("Сервис каталога недоступен ({StatusCode}): {Message}", ex.StatusCode, ex.Message);
            return fallback;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Сервис каталога вернул некорректный JSON");
            return fallback;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return fallback;
        }
    }
}