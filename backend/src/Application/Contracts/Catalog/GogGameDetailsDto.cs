namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Детальные данные игры, спарсенные со страницы GOG (по sourceUrls.gog).</summary>
public sealed record GogGameDetailsDto(
    string? Description,
    string? SystemRequirements);
