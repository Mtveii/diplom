using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SteamId64)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(x => x.Username)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(x => x.AvatarUrl)
            .HasMaxLength(512);

        builder.Property(x => x.AdminUsername)
            .HasMaxLength(64);

        builder.Property(x => x.PasswordHash)
            .HasMaxLength(256);

        builder.HasIndex(x => x.SteamId64)
            .IsUnique();

        builder.HasIndex(x => x.AdminUsername)
            .IsUnique()
            .HasFilter("\"AdminUsername\" IS NOT NULL");

        builder.HasIndex(x => x.Role);
    }
}