namespace SteamAdminPanel.Application.Contracts.Auth;

public sealed record AdminLoginRequestDto(string Username, string Password);