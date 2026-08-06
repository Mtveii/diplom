namespace SteamAdminPanel.Application.Contracts.Monitoring;

public sealed record TopPlayerDto(string SteamId64, string Username, long MinutesPlayed, double HoursPlayed);