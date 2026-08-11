using Microsoft.EntityFrameworkCore;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<AdminActionLog> AdminActionLogs => Set<AdminActionLog>();

    public DbSet<ClanMember> ClanMembers => Set<ClanMember>();

    public DbSet<MemberWarning> MemberWarnings => Set<MemberWarning>();

    public DbSet<MembershipApplication> MembershipApplications => Set<MembershipApplication>();

    public DbSet<MemberProfileHistory> MemberProfileHistories => Set<MemberProfileHistory>();

    public DbSet<PlayerStatusSnapshot> PlayerStatusSnapshots => Set<PlayerStatusSnapshot>();

    public DbSet<PlaytimeSnapshot> PlaytimeSnapshots => Set<PlaytimeSnapshot>();

    public DbSet<GameStatsSnapshot> GameStatsSnapshots => Set<GameStatsSnapshot>();

    public DbSet<AchievementSnapshot> AchievementSnapshots => Set<AchievementSnapshot>();

    public DbSet<AlertRule> AlertRules => Set<AlertRule>();

    public DbSet<AlertHistory> AlertHistories => Set<AlertHistory>();

    public DbSet<NotificationChannelSetting> NotificationChannelSettings => Set<NotificationChannelSetting>();

    public DbSet<CatalogGame> CatalogGames => Set<CatalogGame>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}