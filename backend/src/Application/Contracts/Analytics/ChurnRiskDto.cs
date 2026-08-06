namespace SteamAdminPanel.Application.Contracts.Analytics;

public sealed record ChurnRiskDto(string SteamId64, string Username, int DaysWithoutLogin, double RiskScore);