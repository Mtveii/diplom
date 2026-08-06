using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence.Configurations;

public sealed class AdminActionLogConfiguration : IEntityTypeConfiguration<AdminActionLog>
{
    public void Configure(EntityTypeBuilder<AdminActionLog> builder)
    {
        builder.ToTable("AdminActionLogs");

        builder.HasKey("Id");

        builder.Property(x => x.EntityId)
            .HasMaxLength(64);

        builder.Property(x => x.IpAddress)
            .HasMaxLength(64);

        builder.HasIndex(x => x.Timestamp);
        builder.HasIndex(x => x.EntityType);
        builder.HasIndex(x => x.UserId);
    }
}