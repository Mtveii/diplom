namespace SteamAdminPanel.Application.Contracts.Health;

public sealed record HealthComponentDto(
    string Name,
    bool Healthy,
    string? Message,
    long? LatencyMs);