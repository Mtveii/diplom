namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Запись каталога SteamSpy (request=all).</summary>
public sealed record SteamSpyCatalogEntryDto(
    uint AppId,
    string Name,
    string? Developer,
    string? Publisher,
    long Positive,
    long Negative,
    string? Owners,
    decimal? Price,
    decimal? InitialPrice,
    decimal? DiscountPercent,
    long Ccu);
