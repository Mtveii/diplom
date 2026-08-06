using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Auth;

public sealed record LoginResponseDto(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    int UserId,
    string Username,
    string AvatarUrl,
    UserRole Role);