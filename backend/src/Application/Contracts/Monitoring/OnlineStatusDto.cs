namespace SteamAdminPanel.Application.Contracts.Monitoring;

public sealed record OnlineStatusDto(
    string SteamId64,
    bool IsOnline,
    int? GameId,
    string? GameName,
    DateTime Timestamp);