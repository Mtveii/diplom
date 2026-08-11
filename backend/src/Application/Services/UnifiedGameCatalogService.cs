using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Options;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Services;

/// <summary>
/// Объединённый каталог игр из 4 источников (GOG + Epic + FreeToGame + SteamSpy).
/// Пагинация построена на страницах GOG; записи других источников связываются
/// с записями GOG по нормализованному названию и обогащают карточку.
/// Одиночные записи (без GOG-пары) отдаются отдельной «extra»-страницей.
/// </summary>
public sealed class UnifiedGameCatalogService : IUnifiedGameCatalogService
{
    private readonly ICacheService _cache;
    private readonly IGogClient _gogClient;
    private readonly IEpicGamesClient _epicGamesClient;
    private readonly IFreeToGameClient _freeToGameClient;
    private readonly ISteamSpyCatalogClient _steamSpyCatalogClient;
    private readonly IRepository<CatalogGame> _catalog;
    private readonly IUnitOfWork _unitOfWork;
    private readonly CatalogOptions _options;
    private readonly ILogger<UnifiedGameCatalogService> _logger;

    public UnifiedGameCatalogService(ICacheService cache, IGogClient gogClient,
        IEpicGamesClient epicGamesClient, IFreeToGameClient freeToGameClient,
        ISteamSpyCatalogClient steamSpyCatalogClient, IRepository<CatalogGame> catalog,
        IUnitOfWork unitOfWork, IOptions<CatalogOptions> options, ILogger<UnifiedGameCatalogService> logger)
    {
        _cache = cache;
        _gogClient = gogClient;
        _epicGamesClient = epicGamesClient;
        _freeToGameClient = freeToGameClient;
        _steamSpyCatalogClient = steamSpyCatalogClient;
        _catalog = catalog;
        _unitOfWork = unitOfWork;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<UnifiedCatalogPageDto> GetPageAsync(int page, CancellationToken cancellationToken)
    {
        var cacheKey = $"catalog2:page:{page}";
        var cached = await _cache.GetAsync<UnifiedCatalogPageDto>(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var totalPages = _options.GogMaxPages + 1;
        UnifiedCatalogPageDto result;
        if (page <= _options.GogMaxPages)
        {
            result = await GetGogPageAsync(page, totalPages, cancellationToken);
        }
        else if (page == totalPages)
        {
            result = await GetExtraPageAsync(page, totalPages, cancellationToken);
        }
        else
        {
            result = new UnifiedCatalogPageDto(page, totalPages, 0, Array.Empty<UnifiedGameDto>());
        }

        await _cache.SetAsync(cacheKey, result, TimeSpan.FromHours(_options.CacheTtlHours), cancellationToken);
        return result;
    }

    public async Task<GogGameDetailsDto?> GetGogGameDetailsAsync(string gogUrl,
        CancellationToken cancellationToken)
    {
        var cacheKey = $"catalog2:gog-details:{GameTitleNormalizer.HashId(gogUrl)}";
        var cached = await _cache.GetAsync<GogGameDetailsDto>(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var details = await _gogClient.GetGameDetailsAsync(gogUrl, cancellationToken);
        if (details is not null)
        {
            await _cache.SetAsync(cacheKey, details, TimeSpan.FromHours(_options.CacheTtlHours), cancellationToken);
        }

        return details;
    }

    public async Task<bool> AreSmallSourcesLoadedAsync(CancellationToken cancellationToken)
    {
        return await _catalog.AnyAsync(x => x.Source == CatalogSource.Epic, cancellationToken) &&
               await _catalog.AnyAsync(x => x.Source == CatalogSource.FreeToGame, cancellationToken) &&
               await _catalog.AnyAsync(x => x.Source == CatalogSource.SteamSpy, cancellationToken);
    }

    public async Task ResetSmallSourcesAsync(CancellationToken cancellationToken)
    {
        var smallSources = new[] { CatalogSource.Epic, CatalogSource.FreeToGame, CatalogSource.SteamSpy };
        foreach (var source in smallSources)
        {
            var records = await _catalog.ListAsync(x => x.Source == source, cancellationToken);
            foreach (var record in records)
            {
                _catalog.Remove(record);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Мелкие источники каталога очищены перед перезагрузкой");
    }

    public async Task LoadSmallSourcesAsync(CancellationToken cancellationToken)
    {
        if (_options.EpicEnabled)
        {
            await LoadSourceAsync(CatalogSource.Epic,
                () => _epicGamesClient.GetFreeGamesAsync(cancellationToken), FromEpic, cancellationToken);
        }

        if (_options.FreeToGameEnabled)
        {
            await LoadSourceAsync(CatalogSource.FreeToGame,
                () => _freeToGameClient.GetGamesAsync(cancellationToken), FromFreeToGame, cancellationToken);
        }

        if (_options.SteamSpyEnabled)
        {
            await LoadSourceAsync<SteamSpyCatalogEntryDto>(CatalogSource.SteamSpy, async () =>
                {
                    var all = await _steamSpyCatalogClient.GetCatalogAsync(cancellationToken);
                    return (IReadOnlyList<SteamSpyCatalogEntryDto>)all
                        .OrderByDescending(x => x.Ccu)
                        .Take(_options.SteamSpyTopCount)
                        .ToList();
                }, FromSteamSpy, cancellationToken);
        }
    }

    private async Task LoadSourceAsync<TDto>(CatalogSource source,
        Func<Task<IReadOnlyList<TDto>>> fetch, Func<TDto, CatalogGame> map,
        CancellationToken cancellationToken)
    {
        if (await _catalog.AnyAsync(x => x.Source == source, cancellationToken))
        {
            _logger.LogInformation("Источник {Source} уже загружен, пропускаем", source);
            return;
        }

        var dtos = await fetch();
        var entities = dtos.Select(map).ToList();
        _catalog.AddRange(entities);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Источник {Source} загружен: {Count} записей", source, entities.Count);
    }

    private async Task<UnifiedCatalogPageDto> GetGogPageAsync(int page, int totalPages,
        CancellationToken cancellationToken)
    {
        var gogRecords = await LoadGogPageAsync(page, cancellationToken);
        if (gogRecords.Count == 0)
        {
            return new UnifiedCatalogPageDto(page, totalPages, 0, Array.Empty<UnifiedGameDto>());
        }

        var titles = gogRecords.Select(x => x.NormalizedTitle).Distinct().ToList();
        var allRecords = await _catalog.ListAsync(
            x => x.Source != CatalogSource.Gog || titles.Contains(x.NormalizedTitle), cancellationToken);

        var items = titles
            .Select(title => allRecords.Where(x => x.NormalizedTitle == title).ToList())
            .Select(BuildCard)
            .OrderByDescending(x => x.Price)
            .ToList();

        return new UnifiedCatalogPageDto(page, totalPages, _options.PageSize * totalPages, items);
    }

    private async Task<IReadOnlyList<CatalogGame>> LoadGogPageAsync(int page,
        CancellationToken cancellationToken)
    {
        var records = await _catalog.ListAsync(
            x => x.Source == CatalogSource.Gog && x.GogPage == page, cancellationToken);
        if (records.Count > 0 || !_options.GogEnabled)
        {
            return records;
        }

        var gogPage = await _gogClient.GetPageAsync(page, cancellationToken);
        if (gogPage.Products.Count == 0)
        {
            return records;
        }

        var entities = gogPage.Products.Select(x => FromGog(x, page)).ToList();
        _catalog.AddRange(entities);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("GOG-страница {Page} загружена ({Count} игр)", page, entities.Count);

        return entities;
    }

    private async Task<UnifiedCatalogPageDto> GetExtraPageAsync(int page, int totalPages,
        CancellationToken cancellationToken)
    {
        var gogTitles = (await _catalog.ListAsync(x => x.Source == CatalogSource.Gog, cancellationToken))
            .Select(x => x.NormalizedTitle)
            .ToHashSet();

        var smallRecords = await _catalog.ListAsync(
            x => x.Source == CatalogSource.Epic ||
                 x.Source == CatalogSource.FreeToGame ||
                 x.Source == CatalogSource.SteamSpy,
            cancellationToken);

        var items = smallRecords
            .GroupBy(x => x.NormalizedTitle)
            .Where(g => !gogTitles.Contains(g.Key))
            .Select(g => BuildCard(g.ToList()))
            .OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
            .Take(_options.PageSize)
            .ToList();

        return new UnifiedCatalogPageDto(page, totalPages, smallRecords.Count, items);
    }

    private static UnifiedGameDto BuildCard(IReadOnlyList<CatalogGame> records)
    {
        var steamSpy = records.FirstOrDefault(x => x.Source == CatalogSource.SteamSpy);
        var gog = records.FirstOrDefault(x => x.Source == CatalogSource.Gog);
        var epic = records.FirstOrDefault(x => x.Source == CatalogSource.Epic);
        var freeToGame = records.FirstOrDefault(x => x.Source == CatalogSource.FreeToGame);

        var name = steamSpy?.Title ?? gog?.Title ?? epic?.Title ?? freeToGame?.Title ?? "Unknown";
        var normalized = GameTitleNormalizer.Normalize(name);

        var priceCents = steamSpy?.PriceCents > 0
            ? steamSpy!.PriceCents
            : (gog?.PriceCents ?? epic?.PriceCents) ?? 0m;

        var genres = MergeUnique(gog?.Genres, freeToGame?.Genres);
        var platforms = MergeUnique(gog?.Platforms, freeToGame?.Platforms);

        var sources = new List<string>();
        if (steamSpy is not null)
        {
            sources.Add("steamspy");
        }

        if (gog is not null)
        {
            sources.Add("gog");
        }

        if (epic is not null)
        {
            sources.Add("epic");
        }

        if (freeToGame is not null)
        {
            sources.Add("freetogame");
        }

        return new UnifiedGameDto(
            GameTitleNormalizer.HashId(normalized),
            steamSpy?.SteamAppId,
            name,
            (priceCents ?? 0m) / 100m,
            records.Any(x => x.PriceCents is 0),
            epic?.Description ?? freeToGame?.Description,
            epic?.Image ?? freeToGame?.Image ?? gog?.Image,
            gog?.Gallery ?? [],
            steamSpy?.Developer ?? gog?.Developer ?? freeToGame?.Developer ?? epic?.Developer,
            steamSpy?.Publisher ?? gog?.Publisher ?? epic?.Publisher ?? freeToGame?.Publisher,
            genres,
            platforms,
            steamSpy?.PositiveReviewPercent,
            steamSpy?.OwnersEstimate,
            gog?.ReleaseDate ?? freeToGame?.ReleaseDate ?? epic?.ReleaseDate,
            new UnifiedSourceUrlsDto(gog?.SourceUrlGog, null, freeToGame?.SourceUrlFreeToGame),
            sources);
    }

    private static List<string> MergeUnique(params IReadOnlyList<string>?[] lists)
    {
        return lists
            .Where(x => x is not null)
            .SelectMany(x => x!)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .ToList();
    }

    private static CatalogGame FromEpic(EpicGameDto game)
    {
        var normalized = GameTitleNormalizer.Normalize(game.Title);
        var entity = new CatalogGame(CatalogSource.Epic, game.Title, normalized);
        entity.SetIdentifiers(null, null, game.Id, null, null);

        entity.SetExternalFields(
            game.Description,
            game.Image,
            [],
            game.DeveloperName,
            game.SellerName,
            [],
            [],
            game.DiscountPriceCents,
            null,
            null,
            game.EffectiveDate?.ToString("yyyy-MM-dd"));

        return entity;
    }

    private static CatalogGame FromFreeToGame(FreeToGameGameDto game)
    {
        var normalized = GameTitleNormalizer.Normalize(game.Title);
        var entity = new CatalogGame(CatalogSource.FreeToGame, game.Title, normalized);
        entity.SetIdentifiers(null, null, null, game.Id, null);
        entity.SetSourceUrls(null, null);

        var genres = new List<string>();
        if (!string.IsNullOrWhiteSpace(game.Genre))
        {
            genres.Add(game.Genre);
        }

        var platforms = new List<string>();
        if (!string.IsNullOrWhiteSpace(game.Platform))
        {
            platforms.Add(game.Platform);
        }

        entity.SetExternalFields(
            game.ShortDescription,
            game.Thumbnail,
            [],
            game.Developer,
            game.Publisher,
            genres,
            platforms,
            null,
            null,
            null,
            game.ReleaseDate);

        return entity;
    }

    private static CatalogGame FromSteamSpy(SteamSpyCatalogEntryDto game)
    {
        var normalized = GameTitleNormalizer.Normalize(game.Name);
        var entity = new CatalogGame(CatalogSource.SteamSpy, game.Name, normalized);
        entity.SetIdentifiers(null, null, null, null, (int)game.AppId);

        var totalReviews = game.Positive + game.Negative;
        var rating = totalReviews > 0 ? Math.Round(game.Positive * 100m / totalReviews, 1) : (decimal?)null;

        entity.SetExternalFields(
            null,
            null,
            [],
            game.Developer,
            game.Publisher,
            [],
            [],
            game.Price > 0 ? game.Price : null,
            rating,
            game.Owners,
            null);

        return entity;
    }

    private static CatalogGame FromGog(GogProductDto product, int page)
    {
        var normalized = GameTitleNormalizer.Normalize(product.Title);
        var entity = new CatalogGame(CatalogSource.Gog, product.Title, normalized);
        entity.SetIdentifiers(product.Id, page, null, null, null);

        var platforms = new List<string>();
        if (product.WorksOnWindows)
        {
            platforms.Add("Windows");
        }

        if (product.WorksOnMac)
        {
            platforms.Add("Mac");
        }

        if (product.WorksOnLinux)
        {
            platforms.Add("Linux");
        }

        var releaseDate = product.ReleaseDateUnix is > 0
            ? DateTimeOffset.FromUnixTimeSeconds(product.ReleaseDateUnix.Value).ToString("yyyy-MM-dd")
            : null;

        entity.SetExternalFields(
            null,
            product.BoxImage is null ? null : $"https:{product.BoxImage}",
            product.Gallery.ToList(),
            product.Developer,
            product.Publisher,
            product.Genres.ToList(),
            platforms,
            product.PriceFinalAmount > 0 ? product.PriceFinalAmount * 100m : null,
            null,
            null,
            releaseDate);

        if (!string.IsNullOrWhiteSpace(product.Url))
        {
            entity.SetSourceUrls($"https://www.gog.com{product.Url}", null);
        }

        return entity;
    }
}
