namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>
/// Детальная страница игры: карточка мёрджа + описание/скриншоты FreeToGame.
/// Debug-поля (MatchedAppId, MatchedSteamSpyName) — временно, для ручной сверки матчинга.
/// </summary>
public sealed record CatalogGameDetailDto(
    CatalogListItemDto Game,
    string? Description,
    string? MinimumRequirements,
    IReadOnlyList<string> Screenshots,
    uint? MatchedAppId = null,
    string? MatchedSteamSpyName = null);
