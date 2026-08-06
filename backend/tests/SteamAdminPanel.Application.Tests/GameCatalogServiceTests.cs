using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Application.Services;
using Xunit;

namespace SteamAdminPanel.Application.Tests;

public sealed class GameCatalogServiceTests
{
    private readonly IFreeToGameClient _freeToGame = Substitute.For<IFreeToGameClient>();
    private readonly ISteamSpyCatalogClient _steamSpy = Substitute.For<ISteamSpyCatalogClient>();

    private GameCatalogService CreateService()
    {
        return new GameCatalogService(_freeToGame, _steamSpy,
            Substitute.For<ILogger<GameCatalogService>>());
    }

    private static FreeToGameGameDto Game(int id, string title)
    {
        return new FreeToGameGameDto(id, title, null, null, "Shooter", "PC (Windows)",
            "Publisher", "Developer", "2020-01-01");
    }

    private static SteamSpyCatalogEntryDto Spy(uint appId, string name, long ccu,
        decimal? price = 999, decimal? discountPercent = 0)
    {
        return new SteamSpyCatalogEntryDto(appId, name, "Dev", "Pub", 100, 10,
            "1,000,000 .. 5,000,000", price, price, discountPercent, ccu);
    }

    [Fact]
    public async Task GetCatalogAsync_ExactNameMatch_MergesSteamSpyFields()
    {
        _freeToGame.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Game(1, "Apex Legends") });
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Spy(1172470, "Apex Legends", 124262) });

        var items = await CreateService().GetCatalogAsync(CancellationToken.None);

        var item = items.Should().ContainSingle().Subject;
        item.MatchKind.Should().Be(CatalogMatchKind.MatchedWithSteamSpy);
        item.SteamAppId.Should().Be(1172470);
        item.Ccu.Should().Be(124262);
        item.PositiveReviewPercent.Should().BeApproximately(100m / 110m * 100m, 0.01m);
    }

    [Fact]
    public async Task GetCatalogAsync_VersionSuffix_SkyrimSeMatchesSkyrim()
    {
        _freeToGame.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Game(2, "Skyrim SE") });
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Spy(72850, "Skyrim", 1463) });

        var items = await CreateService().GetCatalogAsync(CancellationToken.None);

        items.Single().MatchKind.Should().Be(CatalogMatchKind.MatchedWithSteamSpy);
    }

    [Fact]
    public async Task GetCatalogAsync_NoMatch_UsesPlaceholders()
    {
        _freeToGame.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Game(3, "Solo Game 3000") });
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Spy(1, "Apex Legends", 1000) });

        var items = await CreateService().GetCatalogAsync(CancellationToken.None);

        var item = items.Single();
        item.MatchKind.Should().Be(CatalogMatchKind.FreeToGameOnly);
        item.SteamAppId.Should().BeNull();
        item.Ccu.Should().BeNull();
        item.Owners.Should().BeNull();
        item.PositiveReviewPercent.Should().BeNull();
    }

    [Fact]
    public async Task GetCatalogAsync_CS2VsCsGo_DoesNotMatch()
    {
        // По ТЗ без словаря алиасов: разные имена не склеиваются.
        _freeToGame.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Game(4, "Counter-Strike 2") });
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Spy(730, "Counter-Strike: Global Offensive", 1013936) });

        var items = await CreateService().GetCatalogAsync(CancellationToken.None);

        items.Single().MatchKind.Should().Be(CatalogMatchKind.FreeToGameOnly);
    }

    [Fact]
    public async Task GetCatalogAsync_SteamSpyPool_LimitsToTop1000ByCcu()
    {
        _freeToGame.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Game(5, "Горячая игра"), Game(6, "Заброшенная игра") });

        var spyCatalog = new List<SteamSpyCatalogEntryDto>();
        for (uint i = 1; i <= 1500; i++)
        {
            spyCatalog.Add(Spy(i, $"Игра {i}", i));
        }

        spyCatalog.Add(Spy(9001, "Горячая игра", 5000));
        spyCatalog.Add(Spy(9002, "Заброшенная игра", 1));
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(spyCatalog);

        var items = await CreateService().GetCatalogAsync(CancellationToken.None);

        items.Single(x => x.Title == "Горячая игра").SteamAppId.Should().Be(9001);
        items.Single(x => x.Title == "Заброшенная игра").MatchKind.Should()
            .Be(CatalogMatchKind.FreeToGameOnly);
    }

    [Fact]
    public async Task GetCatalogAsync_SteamSpyUnavailable_ReturnsFreeToGameOnly()
    {
        _freeToGame.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Game(7, "Apex Legends") });
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromException<IReadOnlyList<SteamSpyCatalogEntryDto>>(
                new HttpRequestException("SteamSpy down")));

        var items = await CreateService().GetCatalogAsync(CancellationToken.None);

        items.Single().MatchKind.Should().Be(CatalogMatchKind.FreeToGameOnly);
        items.Single().Ccu.Should().BeNull();
    }

    [Fact]
    public void Normalize_StripsPunctuationCaseAndSuffixes()
    {
        GameCatalogService.Normalize("Sekiro: Shadows Die Twice - GOTY Edition")
            .Should().Be("sekiro shadows die twice");
        GameCatalogService.Normalize("THE ELDER SCROLLS V: SKYRIM SPECIAL EDITION")
            .Should().Be("the elder scrolls v skyrim");
        GameCatalogService.Normalize("Call of Duty: Modern Warfare 2 (2009)")
            .Should().Be("call of duty modern warfare 2");
        GameCatalogService.Normalize("Grand Theft Auto V Legacy")
            .Should().Be("grand theft auto v");
    }

    [Fact]
    public async Task GetCatalogAsync_FreeToPlayMatch_HasZeroPriceNotNull()
    {
        // SteamSpy отдаёт цену строкой в центах: "0" = бесплатно (данные ЕСТЬ и они нулевые),
        // это не то же самое, что отсутствие метрики (FreeToGameOnly -> null).
        _freeToGame.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Game(8, "Apex Legends") });
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Spy(1172470, "Apex Legends", 124262, price: 0) });

        var items = await CreateService().GetCatalogAsync(CancellationToken.None);

        var item = items.Single();
        item.MatchKind.Should().Be(CatalogMatchKind.MatchedWithSteamSpy);
        item.PriceCents.Should().Be(0);
        item.PriceCents.Should().NotBeNull();
    }

    [Fact]
    public async Task GetCatalogAsync_PaidMatch_KeepsSteamSpyPriceInCents()
    {
        // SteamSpy "1999" = $19.99 — цена хранится в центах как есть.
        _freeToGame.GetGamesAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Game(9, "Awesomenauts") });
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Spy(204300, "Awesomenauts", 1420, price: 1999) });

        var items = await CreateService().GetCatalogAsync(CancellationToken.None);

        var item = items.Single();
        item.PriceCents.Should().Be(1999);
    }

    [Fact]
    public async Task GetGameByIdAsync_Match_ExposesDebugFields()
    {
        // Debug-поля для ручной сверки матчинга: appid + оригинальное имя SteamSpy.
        _freeToGame.GetGameByIdAsync(540, Arg.Any<CancellationToken>())
            .Returns(new FreeToGameGameDetailDto(540, "Overwatch", null, null, null,
                "Shooter", "PC", "Blizzard", "Blizzard", "2016-05-24", null,
                Array.Empty<string>()));
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Spy(1085660, "Overwatch", 32498, price: 0) });

        var detail = await CreateService().GetGameByIdAsync(540, CancellationToken.None);

        detail.MatchedAppId.Should().Be(1085660);
        detail.MatchedSteamSpyName.Should().Be("Overwatch");
    }

    [Fact]
    public async Task GetGameByIdAsync_NoMatch_DebugFieldsAreNull()
    {
        _freeToGame.GetGameByIdAsync(1, Arg.Any<CancellationToken>())
            .Returns(new FreeToGameGameDetailDto(1, "Solo Game 3000", null, null, null,
                "Shooter", "PC", "Pub", "Dev", "2020-01-01", null,
                Array.Empty<string>()));
        _steamSpy.GetCatalogAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { Spy(1, "Apex Legends", 1000) });

        var detail = await CreateService().GetGameByIdAsync(1, CancellationToken.None);

        detail.MatchedAppId.Should().BeNull();
        detail.MatchedSteamSpyName.Should().BeNull();
    }
}