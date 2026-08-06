using SteamAdminPanel.Application.Contracts.Catalog;

namespace SteamAdminPanel.Application.Ports;

public interface ISteamSpyCatalogClient
{
    Task<IReadOnlyList<SteamSpyCatalogEntryDto>> GetCatalogAsync(CancellationToken cancellationToken = default);
}