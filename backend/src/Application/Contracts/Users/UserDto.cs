using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Users;

public sealed record UserDto(
    int Id,
    string SteamId64,
    string Username,
    string AvatarUrl,
    UserRole Role,
    DateTime CreatedAt,
    DateTime? LastLoginAt);