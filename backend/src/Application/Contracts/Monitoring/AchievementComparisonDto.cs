namespace SteamAdminPanel.Application.Contracts.Monitoring;

public sealed record AchievementComparisonDto(string AchievementId, string? Name, decimal ClanUnlockPercent,
    decimal? GlobalUnlockPercent, int ClanOwners);