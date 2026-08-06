using SteamAdminPanel.Application.Contracts.Catalog;

namespace SteamAdminPanel.Application.Interfaces;

public interface IGameCatalogService
{
    Task<IReadOnlyList<CatalogListItemDto>> GetCatalogAsync(CancellationToken cancellationToken = default);

    Task<CatalogGameDetailDto> GetGameByIdAsync(int id, CancellationToken cancellationToken = default);
}