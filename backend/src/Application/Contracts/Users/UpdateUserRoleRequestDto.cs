using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Users;

public sealed record UpdateUserRoleRequestDto(UserRole Role);