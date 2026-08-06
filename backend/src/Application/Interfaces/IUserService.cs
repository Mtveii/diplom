using SteamAdminPanel.Application.Contracts.Common;
using SteamAdminPanel.Application.Contracts.Users;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Interfaces;

public interface IUserService
{
    Task<PagedResultDto<UserDto>> GetUsersAsync(int page, int pageSize, string? search,
        CancellationToken cancellationToken = default);

    Task<UserDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<UserDto> UpdateRoleAsync(int id, UserRole role, int actorUserId,
        CancellationToken cancellationToken = default);
}