using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SteamAdminPanel.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AchievementSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SteamId64 = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AppId = table.Column<long>(type: "bigint", nullable: false),
                    AchievementId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Unlocked = table.Column<bool>(type: "boolean", nullable: false),
                    UnlockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AchievementSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdminActionLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    Action = table.Column<int>(type: "integer", nullable: false),
                    EntityType = table.Column<int>(type: "integer", nullable: false),
                    EntityId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    OldValue = table.Column<string>(type: "text", nullable: true),
                    NewValue = table.Column<string>(type: "text", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminActionLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AlertHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RuleId = table.Column<int>(type: "integer", nullable: false),
                    TriggeredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertHistories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AlertRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    TargetId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Condition = table.Column<int>(type: "integer", nullable: false),
                    ThresholdValue = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ClanMembers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SteamId64 = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    InternalRank = table.Column<int>(type: "integer", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClanMembers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GameStatsSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AppId = table.Column<long>(type: "bigint", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    DiscountPercent = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    PositiveReviewPercent = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    TotalReviews = table.Column<long>(type: "bigint", nullable: true),
                    OwnerCount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameStatsSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MemberProfileHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MemberId = table.Column<int>(type: "integer", nullable: false),
                    Field = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    OldValue = table.Column<string>(type: "text", nullable: true),
                    NewValue = table.Column<string>(type: "text", nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberProfileHistories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MembershipApplications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SteamId64 = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewedByUserId = table.Column<int>(type: "integer", nullable: true),
                    Comment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MembershipApplications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MemberWarnings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MemberId = table.Column<int>(type: "integer", nullable: false),
                    IssuedByUserId = table.Column<int>(type: "integer", nullable: true),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Severity = table.Column<int>(type: "integer", nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberWarnings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationChannelSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Channel = table.Column<int>(type: "integer", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    ConfigJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationChannelSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlayerStatusSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SteamId64 = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsOnline = table.Column<bool>(type: "boolean", nullable: false),
                    GameId = table.Column<int>(type: "integer", nullable: true),
                    GameName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerStatusSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlaytimeSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SteamId64 = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AppId = table.Column<long>(type: "bigint", nullable: false),
                    MinutesTotal = table.Column<long>(type: "bigint", nullable: false),
                    MinutesLastTwoWeeks = table.Column<long>(type: "bigint", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaytimeSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SteamId64 = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AvatarUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AdminUsername = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    PasswordHash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AchievementSnapshots_SteamId64_AppId_AchievementId_Timestamp",
                table: "AchievementSnapshots",
                columns: new[] { "SteamId64", "AppId", "AchievementId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_AdminActionLogs_EntityType",
                table: "AdminActionLogs",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_AdminActionLogs_Timestamp",
                table: "AdminActionLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_AdminActionLogs_UserId",
                table: "AdminActionLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AlertHistories_IsRead",
                table: "AlertHistories",
                column: "IsRead");

            migrationBuilder.CreateIndex(
                name: "IX_AlertHistories_TriggeredAt",
                table: "AlertHistories",
                column: "TriggeredAt");

            migrationBuilder.CreateIndex(
                name: "IX_AlertRules_IsActive",
                table: "AlertRules",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ClanMembers_InternalRank",
                table: "ClanMembers",
                column: "InternalRank");

            migrationBuilder.CreateIndex(
                name: "IX_ClanMembers_Status",
                table: "ClanMembers",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ClanMembers_SteamId64",
                table: "ClanMembers",
                column: "SteamId64",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GameStatsSnapshots_AppId_Timestamp",
                table: "GameStatsSnapshots",
                columns: new[] { "AppId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_MemberProfileHistories_MemberId_ChangedAt",
                table: "MemberProfileHistories",
                columns: new[] { "MemberId", "ChangedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MembershipApplications_SteamId64_Status",
                table: "MembershipApplications",
                columns: new[] { "SteamId64", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_MemberWarnings_MemberId_IsActive",
                table: "MemberWarnings",
                columns: new[] { "MemberId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationChannelSettings_Channel",
                table: "NotificationChannelSettings",
                column: "Channel",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlayerStatusSnapshots_SteamId64_Timestamp",
                table: "PlayerStatusSnapshots",
                columns: new[] { "SteamId64", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_PlaytimeSnapshots_SteamId64_AppId_Timestamp",
                table: "PlaytimeSnapshots",
                columns: new[] { "SteamId64", "AppId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_AdminUsername",
                table: "Users",
                column: "AdminUsername",
                unique: true,
                filter: "\"AdminUsername\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Role",
                table: "Users",
                column: "Role");

            migrationBuilder.CreateIndex(
                name: "IX_Users_SteamId64",
                table: "Users",
                column: "SteamId64",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AchievementSnapshots");

            migrationBuilder.DropTable(
                name: "AdminActionLogs");

            migrationBuilder.DropTable(
                name: "AlertHistories");

            migrationBuilder.DropTable(
                name: "AlertRules");

            migrationBuilder.DropTable(
                name: "ClanMembers");

            migrationBuilder.DropTable(
                name: "GameStatsSnapshots");

            migrationBuilder.DropTable(
                name: "MemberProfileHistories");

            migrationBuilder.DropTable(
                name: "MembershipApplications");

            migrationBuilder.DropTable(
                name: "MemberWarnings");

            migrationBuilder.DropTable(
                name: "NotificationChannelSettings");

            migrationBuilder.DropTable(
                name: "PlayerStatusSnapshots");

            migrationBuilder.DropTable(
                name: "PlaytimeSnapshots");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
