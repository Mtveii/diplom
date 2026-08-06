namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Детальная страница игры FreeToGame (описание, скриншоты, требования).</summary>
public sealed record FreeToGameGameDetailDto(
    int Id,
    string Title,
    string? Thumbnail,
    string? ShortDescription,
    string? Description,
    string? Genre,
    string? Platform,
    string? Publisher,
    string? Developer,
    string? ReleaseDate,
    string? MinimumRequirements,
    IReadOnlyList<string> Screenshots);
