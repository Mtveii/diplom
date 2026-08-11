namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Карточка игры в объединённом каталоге (нормализованный JSON-формат).</summary>
public sealed record UnifiedGameDto(
    string Id,
    int? SteamAppId,
    string Name,
    decimal Price,
    bool IsFree,
    string? Description,
    string? Image,
    IReadOnlyList<string> Gallery,
    string? Developer,
    string? Publisher,
    IReadOnlyList<string> Genres,
    IReadOnlyList<string> Platforms,
    decimal? Rating,
    string? OwnersEstimate,
    string? ReleaseDate,
    UnifiedSourceUrlsDto SourceUrls,
    IReadOnlyList<string> Sources);