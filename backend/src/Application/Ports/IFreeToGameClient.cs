using SteamAdminPanel.Application.Contracts.Catalog;

namespace SteamAdminPanel.Application.Ports;

public interface IFreeToGameClient
{
    Task<IReadOnlyList<FreeToGameGameDto>> GetGamesAsync(CancellationToken cancellationToken = default);

    Task<FreeToGameGameDetailDto?> GetGameByIdAsync(int id, CancellationToken cancellationToken = default);
}