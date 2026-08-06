using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence.Configurations;

public sealed class ClanMemberConfiguration : IEntityTypeConfiguration<ClanMember>
{
    public void Configure(EntityTypeBuilder<ClanMember> builder)
    {
        builder.ToTable("ClanMembers");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SteamId64)
            .HasMaxLength(32)
            .IsRequired();

        builder.HasIndex(x => x.SteamId64)
            .IsUnique();

        builder.HasIndex(x => x.InternalRank);
        builder.HasIndex(x => x.Status);
    }
}