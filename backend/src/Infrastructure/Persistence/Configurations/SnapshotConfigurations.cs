using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence.Configurations;

public sealed class SnapshotConfigurations : IEntityTypeConfiguration<PlayerStatusSnapshot>,
    IEntityTypeConfiguration<PlaytimeSnapshot>,
    IEntityTypeConfiguration<GameStatsSnapshot>,
    IEntityTypeConfiguration<AchievementSnapshot>
{
    public void Configure(EntityTypeBuilder<PlayerStatusSnapshot> builder)
    {
        builder.ToTable("PlayerStatusSnapshots");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SteamId64)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(x => x.GameName)
            .HasMaxLength(256);

        builder.HasIndex(x => new { x.SteamId64, x.Timestamp });
    }

    public void Configure(EntityTypeBuilder<PlaytimeSnapshot> builder)
    {
        builder.ToTable("PlaytimeSnapshots");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SteamId64)
            .HasMaxLength(32)
            .IsRequired();

        builder.HasIndex(x => new { x.SteamId64, x.AppId, x.Timestamp });
    }

    public void Configure(EntityTypeBuilder<GameStatsSnapshot> builder)
    {
        builder.ToTable("GameStatsSnapshots");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Price)
            .HasPrecision(18, 2);

        builder.Property(x => x.DiscountPercent)
            .HasPrecision(8, 2);

        builder.Property(x => x.PositiveReviewPercent)
            .HasPrecision(8, 2);

        builder.Property(x => x.OwnerCount)
            .HasPrecision(18, 2);

        builder.HasIndex(x => new { x.AppId, x.Timestamp });
    }

    public void Configure(EntityTypeBuilder<AchievementSnapshot> builder)
    {
        builder.ToTable("AchievementSnapshots");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SteamId64)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(x => x.AchievementId)
            .HasMaxLength(128)
            .IsRequired();

        builder.HasIndex(x => new { x.SteamId64, x.AppId, x.AchievementId, x.Timestamp });
    }
}