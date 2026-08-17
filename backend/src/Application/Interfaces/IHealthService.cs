using SteamAdminPanel.Application.Contracts.Health;

namespace SteamAdminPanel.Application.Interfaces;

public interface IHealthService
{
    Task<SystemHealthDto> GetHealthAsync(CancellationToken cancellationToken = default);
}