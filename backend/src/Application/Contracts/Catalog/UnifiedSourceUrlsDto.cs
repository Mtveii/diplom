namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>URL-ссылки на внешние источники карточки объединённого каталога.</summary>
public sealed record UnifiedSourceUrlsDto(
    string? Gog,
    string? Epic,
    string? Freetogame);