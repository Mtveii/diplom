using SteamAdminPanel.Application.Contracts.Auth;

namespace SteamAdminPanel.Application.Interfaces;

public interface IAuthService
{
    Task<SteamLoginUrlDto> GetSteamLoginUrlAsync(string returnUrl, CancellationToken cancellationToken = default);

    Task<LoginResponseDto> HandleSteamCallbackAsync(IReadOnlyDictionary<string, string> query, string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<LoginResponseDto> AdminLoginAsync(AdminLoginRequestDto request, string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<LoginResponseDto> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);

    Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default);
}