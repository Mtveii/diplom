namespace SteamAdminPanel.Application.Contracts.Steam;

public sealed record AchievementPercentDto(string AchievementId, string? Name, decimal Percent);