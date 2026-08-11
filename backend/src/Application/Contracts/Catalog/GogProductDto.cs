namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Продукт из каталога GOG (ajax/filtered).</summary>
public sealed record GogProductDto(
    long Id,
    string Title,
    string? BoxImage,
    string? Developer,
    string? Publisher,
    IReadOnlyList<string> Genres,
    bool WorksOnWindows,
    bool WorksOnMac,
    bool WorksOnLinux,
    long? ReleaseDateUnix,
    string? Url,
    decimal PriceAmount,
    string? Currency,
    decimal PriceFinalAmount,
    bool IsDiscounted,
    decimal DiscountPercentage,
    IReadOnlyList<string> Gallery);
