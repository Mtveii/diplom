using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence.Configurations;

public sealed class CatalogGameConfiguration : IEntityTypeConfiguration<CatalogGame>
{
    public void Configure(EntityTypeBuilder<CatalogGame> builder)
    {
        builder.ToTable("CatalogGames");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .HasMaxLength(512)
            .IsRequired();

        builder.Property(x => x.NormalizedTitle)
            .HasMaxLength(512)
            .IsRequired();

        builder.Property(x => x.Gallery)
            .HasColumnType("jsonb");

        builder.Property(x => x.Genres)
            .HasColumnType("jsonb");

        builder.Property(x => x.Platforms)
            .HasColumnType("jsonb");

        builder.Property(x => x.PriceCents)
            .HasPrecision(18, 2);

        builder.Property(x => x.PositiveReviewPercent)
            .HasPrecision(8, 2);

        builder.HasIndex(x => new { x.Source, x.NormalizedTitle });
        builder.HasIndex(x => new { x.Source, x.GogPage });
    }
}
