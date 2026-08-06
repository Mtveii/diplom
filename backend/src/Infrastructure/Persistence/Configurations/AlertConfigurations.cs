using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence.Configurations;

public sealed class AlertConfigurations : IEntityTypeConfiguration<AlertRule>,
    IEntityTypeConfiguration<AlertHistory>
{
    public void Configure(EntityTypeBuilder<AlertRule> builder)
    {
        builder.ToTable("AlertRules");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.TargetId)
            .HasMaxLength(32);

        builder.Property(x => x.ThresholdValue)
            .HasPrecision(18, 4);

        builder.HasIndex(x => x.IsActive);
    }

    public void Configure(EntityTypeBuilder<AlertHistory> builder)
    {
        builder.ToTable("AlertHistories");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Message)
            .HasMaxLength(1000)
            .IsRequired();

        builder.HasIndex(x => x.TriggeredAt);
        builder.HasIndex(x => x.IsRead);
    }
}