namespace SteamAdminPanel.Application.Contracts.Analytics;

public sealed record RetentionPointDto(int Day, double RetainedPercent, int CohortSize);