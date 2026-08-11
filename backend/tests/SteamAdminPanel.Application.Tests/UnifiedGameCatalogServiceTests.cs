using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Options;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Application.Services;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;
using Xunit;

namespace SteamAdminPanel.Application.Tests;

public sealed class UnifiedGameCatalogServiceTests
{
    private readonly ICacheService _cache = Substitute.For<ICacheService>();
    private readonly IGogClient _gogClient = Substitute.For<IGogClient>();
    private readonly IEpicGamesClient _epicClient = Substitute.For<IEpicGamesClient>();
    private readonly IFreeToGameClient _freeToGameClient = Substitute.For<IFreeToGameClient>();
    private readonly ISteamSpyCatalogClient _steamSpyClient = Substitute.For<ISteamSpyCatalogClient>();
    private readonly IRepository<CatalogGame> _catalog = Substitute.For<IRepository<CatalogGame>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private CatalogGame GogGame(string title, long id, int page, decimal finalAmount, string url = "/en/game/foo")
    {
        var entity = new CatalogGame(CatalogSource.Gog, title, GameTitleNormalizer.Normalize(title));
        entity.SetIdentifiers(id, page, null, null, null);
        entity.SetSourceUrls($"https://www.gog.com{url}", null);
        entity.SetExternalFields(null, "https://images.gog.com/box.png", ["gal1", "gal2"],
            "GogDev", "GogPub", ["Strategy"], ["Windows", "Mac"], finalAmount * 100m, null, null,
            "2020-05-01");
        return entity;
    }

    private CatalogGame SteamSpyGame(string name, uint appId, decimal? price, long positive,
        long negative = 0)
    {
        var entity = new CatalogGame(CatalogSource.SteamSpy, name, GameTitleNormalizer.Normalize(name));
        entity.SetIdentifiers(null, null, null, null, (int)appId);
        var total = positive + negative;
        entity.SetExternalFields(null, null, [], "SpyDev", "SpyPub", [], [], price,
            total > 0 ? positive * 100m / total : null, "1,000,000 .. 5,000,000", null);
        return entity;
    }

    private CatalogGame EpicGame(string title, string id, decimal? priceCents)
    {
        var entity = new CatalogGame(CatalogSource.Epic, title, GameTitleNormalizer.Normalize(title));
        entity.SetIdentifiers(null, null, id, null, null);
        entity.SetExternalFields("Epic desc", "https://epic.com/img.png", [], "EpicDev", "EpicSeller",
            [], [], priceCents, null, null, "2021-02-02");
        return entity;
    }

    private CatalogGame FreeToGameGame(string title, int id)
    {
        var entity = new CatalogGame(CatalogSource.FreeToGame, title,
            GameTitleNormalizer.Normalize(title));
        entity.SetIdentifiers(null, null, null, id, null);
        entity.SetSourceUrls(null, "https://www.freetogame.com/game/42");
        entity.SetExternalFields("FTG desc", "https://ftg.com/thumb.png", [], "FtgDev", "FtgPub",
            ["Shooter"], ["PC (Windows)"], null, null, null, "2019-03-03");
        return entity;
    }

    private UnifiedGameCatalogService CreateService(CatalogOptions? options = null)
    {
        return new UnifiedGameCatalogService(_cache, _gogClient, _epicClient, _freeToGameClient,
            _steamSpyClient, _catalog, _unitOfWork,
            Microsoft.Extensions.Options.Options.Create(
                options ?? new CatalogOptions { GogMaxPages = 400, SteamSpyTopCount = 5000 }),
            Substitute.For<ILogger<UnifiedGameCatalogService>>());
    }

    [Fact]
    public async Task GetPageAsync_NoCache_FetchesGogPageFromDbAndMerges()
    {
        var page1 = new[] { GogGame("Counter-Strike 2", 100, 1, 9.99m) };
        _cache.GetAsync<UnifiedCatalogPageDto>(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<UnifiedCatalogPageDto?>(null));
        _catalog.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<CatalogGame, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns(page1, new[]
            {
                page1[0],
                SteamSpyGame("Counter-Strike 2", 730, 999, 100)
            });

        var result = await CreateService().GetPageAsync(1, CancellationToken.None);

        var item = result.Items.Should().ContainSingle().Subject;
        item.Name.Should().Be("Counter-Strike 2");
        item.SteamAppId.Should().Be(730);
        item.Price.Should().Be(9.99m);
        item.IsFree.Should().BeFalse();
        item.Rating.Should().Be(100m);
        item.Genres.Should().Contain("Strategy");
    }

    [Fact]
    public async Task GetPageAsync_NotInDb_FetchesFromGogClientAndSaves()
    {
        _cache.GetAsync<UnifiedCatalogPageDto>(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<UnifiedCatalogPageDto?>(null));
        _catalog.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<CatalogGame, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns(Array.Empty<CatalogGame>(), Array.Empty<CatalogGame>());
        _gogClient.GetPageAsync(1, Arg.Any<CancellationToken>())
            .Returns(new GogPageDto(1, 400, 19194,
                new[]
                {
                    new GogProductDto(42, "Offworld Trading Company", null, "Dev", "Pub",
                        new[] { "Strategy" }, true, true, false, 1234567, "/en/game/offworld", 0m,
                        "USD", 2.69m, false, 0m, Array.Empty<string>())
                }));

        await CreateService().GetPageAsync(1, CancellationToken.None);

        _catalog.Received(1).AddRange(Arg.Any<IEnumerable<CatalogGame>>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetPageAsync_SteamSpyPriceWins_ThenGogThenEpic()
    {
        var page1 = new[] { GogGame("Some Game", 100, 1, 19.99m) };
        _cache.GetAsync<UnifiedCatalogPageDto>(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<UnifiedCatalogPageDto?>(null));
        _catalog.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<CatalogGame, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns(page1,
                new[]
                {
                    page1[0],
                    SteamSpyGame("Some Game", 1, 999, 10),
                    EpicGame("Some Game", "epic-1", 0)
                });

        var item = (await CreateService().GetPageAsync(1, CancellationToken.None)).Items.Single();

        // SteamSpy 9.99 $ побеждает GOG 19.99 $ и Epic free.
        item.Price.Should().Be(9.99m);
        item.IsFree.Should().BeTrue(); // Epic помечает free (цена 0 в любом источнике)
    }

    [Fact]
    public async Task GetPageAsync_EpicOnly_ReturnsCardFromEpic()
    {
        _cache.GetAsync<UnifiedCatalogPageDto>(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<UnifiedCatalogPageDto?>(null));
        var page1 = Array.Empty<CatalogGame>();
        _catalog.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<CatalogGame, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns(page1, Array.Empty<CatalogGame>());
        _gogClient.GetPageAsync(1, Arg.Any<CancellationToken>())
            .Returns(new GogPageDto(1, 400, 0, Array.Empty<GogProductDto>()));

        var result = await CreateService().GetPageAsync(1, CancellationToken.None);

        result.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPageAsync_ExtraPage_ReturnsOnlyOrphans()
    {
        _cache.GetAsync<UnifiedCatalogPageDto>(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<UnifiedCatalogPageDto?>(null));
        var orphans = new[] { EpicGame("Only On Epic", "epic-9", 0) };
        _catalog.ListAsync(Arg.Any<System.Linq.Expressions.Expression<Func<CatalogGame, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns(
                new[] { GogGame("Matched", 1, 1, 9.99m) }, // GOG записи (для extra страницы)
                orphans); // все малые записи

        var result = await CreateService().GetPageAsync(401, CancellationToken.None);

        var item = result.Items.Should().ContainSingle().Subject;
        item.Name.Should().Be("Only On Epic");
        item.Sources.Should().Contain("epic");
    }

    [Fact]
    public async Task LoadSmallSources_NotLoaded_CallsClientsAndSaves()
    {
        _catalog.AnyAsync(Arg.Any<System.Linq.Expressions.Expression<Func<CatalogGame, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns(false);
        _epicClient.GetFreeGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { new EpicGameDto("e1", "Epic Only", "d", DateTime.UtcNow, "$0", 0,
                "img", "Seller", "Dev") });
        _freeToGameClient.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { new FreeToGameGameDto(1, "FTG Only", "t", "sd", "RPG", "PC",
                "Pub", "Dev", "2020-01-01") });
        _steamSpyClient.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[]
            {
                new SteamSpyCatalogEntryDto(1, "Hot", "Dev", "Pub", 100, 0, "1m", 0, 0, 0, 9999),
                new SteamSpyCatalogEntryDto(2, "Cold", "Dev", "Pub", 0, 0, null, null, null, null, 1)
            });

        await CreateService().LoadSmallSourcesAsync(CancellationToken.None);

        _catalog.Received(3).AddRange(Arg.Any<IEnumerable<CatalogGame>>());
        await _unitOfWork.Received(3).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoadSmallSources_AlreadyLoaded_SkipsEverything()
    {
        _catalog.AnyAsync(Arg.Any<System.Linq.Expressions.Expression<Func<CatalogGame, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns(true);

        await CreateService().LoadSmallSourcesAsync(CancellationToken.None);

        _catalog.DidNotReceive().AddRange(Arg.Any<IEnumerable<CatalogGame>>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}