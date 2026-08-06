namespace SteamAdminPanel.Application.Contracts.Monitoring;

public sealed record GameMonitorDto(
    uint AppId,
    string Name,
    decimal? CurrentPrice,
    decimal? CurrentDiscountPercent,
    decimal? PositiveReviewPercent,
    long? TotalReviews,
    IReadOnlyList<GameTrendPointDto> Trend,
    IReadOnlyList<AchievementComparisonDto> Achievements,
    int ClanOwners);