namespace SteamAdminPanel.Application.Contracts.Health;

public sealed record SystemHealthDto(
    string Status,
    DateTime TimestampUtc,
    TimeSpan Uptime,
    string Version,
    IReadOnlyList<HealthComponentDto> Components);