using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence.Configurations;

public sealed class ModerationConfigurations : IEntityTypeConfiguration<MemberWarning>,
    IEntityTypeConfiguration<MembershipApplication>,
    IEntityTypeConfiguration<MemberProfileHistory>,
    IEntityTypeConfiguration<NotificationChannelSetting>
{
    public void Configure(EntityTypeBuilder<MemberWarning> builder)
    {
        builder.ToTable("MemberWarnings");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Reason)
            .HasMaxLength(500)
            .IsRequired();

        builder.HasIndex(x => new { x.MemberId, x.IsActive });
    }

    public void Configure(EntityTypeBuilder<MembershipApplication> builder)
    {
        builder.ToTable("MembershipApplications");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SteamId64)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(x => x.Comment)
            .HasMaxLength(1000);

        builder.HasIndex(x => new { x.SteamId64, x.Status });
    }

    public void Configure(EntityTypeBuilder<MemberProfileHistory> builder)
    {
        builder.ToTable("MemberProfileHistories");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Field)
            .HasMaxLength(64)
            .IsRequired();

        builder.HasIndex(x => new { x.MemberId, x.ChangedAt });
    }

    public void Configure(EntityTypeBuilder<NotificationChannelSetting> builder)
    {
        builder.ToTable("NotificationChannelSettings");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.Channel)
            .IsUnique();
    }
}