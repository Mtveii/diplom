using SteamAdminPanel.Application.Contracts.Catalog;

namespace SteamAdminPanel.Application.Ports;

/// <summary>HTTP-клиент к Epic Games Store: только текущие бесплатные раздачи.</summary>
public interface IEpicGamesClient
{
    Task<IReadOnlyList<EpicGameDto>> GetFreeGamesAsync(CancellationToken cancellationToken = default);
}
