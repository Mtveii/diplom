using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SteamAdminPanel.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CatalogGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CatalogGames",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    NormalizedTitle = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    GogGameId = table.Column<long>(type: "bigint", nullable: true),
                    GogPage = table.Column<int>(type: "integer", nullable: true),
                    EpicGameId = table.Column<string>(type: "text", nullable: true),
                    FreeToGameId = table.Column<int>(type: "integer", nullable: true),
                    SteamAppId = table.Column<int>(type: "integer", nullable: true),
                    PriceCents = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Image = table.Column<string>(type: "text", nullable: true),
                    Gallery = table.Column<List<string>>(type: "jsonb", nullable: false),
                    Developer = table.Column<string>(type: "text", nullable: true),
                    Publisher = table.Column<string>(type: "text", nullable: true),
                    Genres = table.Column<List<string>>(type: "jsonb", nullable: false),
                    Platforms = table.Column<List<string>>(type: "jsonb", nullable: false),
                    PositiveReviewPercent = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    OwnersEstimate = table.Column<string>(type: "text", nullable: true),
                    ReleaseDate = table.Column<string>(type: "text", nullable: true),
                    SourceUrlGog = table.Column<string>(type: "text", nullable: true),
                    SourceUrlFreeToGame = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogGames", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogGames_Source_GogPage",
                table: "CatalogGames",
                columns: new[] { "Source", "GogPage" });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogGames_Source_NormalizedTitle",
                table: "CatalogGames",
                columns: new[] { "Source", "NormalizedTitle" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CatalogGames");
        }
    }
}
