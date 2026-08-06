namespace SteamAdminPanel.Domain.Entities;

public sealed class GameStatsSnapshot
{
    private GameStatsSnapshot()
    {
    }

    public GameStatsSnapshot(uint appId, decimal? price, decimal? discountPercent, decimal? positiveReviewPercent,
        long? totalReviews, decimal? ownerCount)
    {
        AppId = appId;
        Price = price;
        DiscountPercent = discountPercent;
        PositiveReviewPercent = positiveReviewPercent;
        TotalReviews = totalReviews;
        OwnerCount = ownerCount;
        Timestamp = DateTime.UtcNow;
    }

    public int Id { get; private set; }

    public uint AppId { get; private set; }

    public decimal? Price { get; private set; }

    public decimal? DiscountPercent { get; private set; }

    public decimal? PositiveReviewPercent { get; private set; }

    public long? TotalReviews { get; private set; }

    public decimal? OwnerCount { get; private set; }

    public DateTime Timestamp { get; private set; }
}