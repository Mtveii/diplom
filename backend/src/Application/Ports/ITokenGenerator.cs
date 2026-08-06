using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Application.Ports;

public interface ITokenGenerator
{
    string GenerateAccessToken(User user);

    string GenerateRefreshToken();

    DateTime GetAccessTokenExpiry();

    DateTime GetRefreshTokenExpiry();

    string HashToken(string token);
}