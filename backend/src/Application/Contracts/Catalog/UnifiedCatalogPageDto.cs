namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Страница объединённого каталога.</summary>
public sealed record UnifiedCatalogPageDto(
    int Page,
    int TotalPages,
    int TotalResults,
    IReadOnlyList<UnifiedGameDto> Items);