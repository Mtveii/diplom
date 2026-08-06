namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Игра из каталога FreeToGame (основной источник).</summary>
public sealed record FreeToGameGameDto(
    int Id,
    string Title,
    string? Thumbnail,
    string? ShortDescription,
    string? Genre,
    string? Platform,
    string? Publisher,
    string? Developer,
    string? ReleaseDate);
