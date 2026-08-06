namespace SteamAdminPanel.Application.Contracts.Steam;

public sealed record GameStatsDto(
    decimal? Price,
    decimal? DiscountPercent,
    decimal? PositiveReviewPercent,
    long? TotalReviews,
    decimal? OwnerCount);