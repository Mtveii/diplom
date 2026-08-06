using SteamAdminPanel.Application.Contracts.Common;
using SteamAdminPanel.Application.Contracts.Users;
using SteamAdminPanel.Application.Exceptions;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Services;

public sealed class UserService : IUserService
{
    private readonly IRepository<User> _users;
    private readonly IAuditService _auditService;

    public UserService(IRepository<User> users, IAuditService auditService)
    {
        _users = users;
        _auditService = auditService;
    }

    public async Task<PagedResultDto<UserDto>> GetUsersAsync(int page, int pageSize, string? search,
        CancellationToken cancellationToken)
    {
        var allUsers = await _users.ListAsync(null, cancellationToken);

        IEnumerable<User> filtered = allUsers;
        if (!string.IsNullOrWhiteSpace(search))
        {
            filtered = filtered.Where(x => x.Username.Contains(search, StringComparison.OrdinalIgnoreCase)
                                           || x.SteamId64.Contains(search));
        }

        var totalCount = filtered.Count();
        var items = filtered
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(MapToDto)
            .ToList();

        return new PagedResultDto<UserDto>(items, totalCount, page, pageSize);
    }

    public async Task<UserDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(id, cancellationToken)
                   ?? throw new NotFoundException($"Пользователь {id} не найден.");
        return MapToDto(user);
    }

    public async Task<UserDto> UpdateRoleAsync(int id, UserRole role, int actorUserId,
        CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(id, cancellationToken)
                   ?? throw new NotFoundException($"Пользователь {id} не найден.");

        var oldRole = user.Role;
        user.SetRole(role);
        _users.Update(user);
        await _auditService.LogAsync(actorUserId, AuditAction.RoleChange, AuditEntityType.User, id.ToString(),
            oldRole.ToString(), role.ToString(), cancellationToken: cancellationToken);

        return MapToDto(user);
    }

    private static UserDto MapToDto(User user)
    {
        return new UserDto(user.Id, user.SteamId64, user.Username, user.AvatarUrl, user.Role, user.CreatedAt,
            user.LastLoginAt);
    }
}