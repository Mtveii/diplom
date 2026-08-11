using SteamAdminPanel.Application.Contracts.Catalog;

namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Страница каталога GOG: список продуктов + метаданные пагинации.</summary>
public sealed record GogPageDto(
    int Page,
    int TotalPages,
    int TotalResults,
    IReadOnlyList<GogProductDto> Products);
