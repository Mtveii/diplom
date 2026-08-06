namespace SteamAdminPanel.Application.Contracts.Monitoring;

public sealed record GameTrendPointDto(DateTime Timestamp, decimal? Price, decimal? DiscountPercent,
    decimal? PositiveReviewPercent, long? TotalReviews);