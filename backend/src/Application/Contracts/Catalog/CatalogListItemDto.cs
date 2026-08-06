namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Карточка игры в объединённом каталоге (FreeToGame + SteamSpy).</summary>
public sealed record CatalogListItemDto(
    int FreeToGameId,
    string Title,
    string? Thumbnail,
    string? ShortDescription,
    string? Genre,
    string? Platform,
    string? Publisher,
    string? Developer,
    string? ReleaseDate,
    CatalogMatchKind MatchKind,
    uint? SteamAppId,
    long? Ccu,
    string? Owners,
    decimal? PositiveReviewPercent,
    decimal? PriceCents,
    decimal? DiscountPercent);
