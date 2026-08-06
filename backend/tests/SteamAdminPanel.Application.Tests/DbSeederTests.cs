using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;
using SteamAdminPanel.Infrastructure.Authentication;
using SteamAdminPanel.Infrastructure.Persistence;
using Xunit;

namespace SteamAdminPanel.Application.Tests;

public sealed class DbSeederTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"seeder-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static IConfiguration Configuration(Dictionary<string, string?> seedValues)
    {
        var values = new Dictionary<string, string?>
        {
            ["Database:SeedAdmin:Username"] = "admin",
            ["Database:SeedAdmin:Password"] = "admin",
        };
        foreach (var (key, value) in seedValues)
        {
            values[key] = value;
        }

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    [Fact]
    public async Task SeedDefaultAdminAsync_CreatesAdminWithHashedPassword()
    {
        await using var db = CreateDbContext();
        var hasher = new Pbkdf2PasswordHasher();
        var seeder = new DbSeeder(db, hasher, Configuration(new Dictionary<string, string?>()),
            Substitute.For<ILogger<DbSeeder>>());

        await seeder.SeedDefaultAdminAsync();

        var admin = await db.Users.SingleAsync(u => u.AdminUsername == "admin");
        admin.AdminUsername.Should().Be("admin");
        admin.Role.Should().Be(UserRole.SuperAdmin);
        hasher.Verify("admin", admin.PasswordHash!).Should().BeTrue();
    }

    [Fact]
    public async Task SeedDefaultAdminAsync_DoesNotCreateDuplicateWhenAdminExists()
    {
        await using var db = CreateDbContext();
        var existing = new User("76561198212420001", "existing", string.Empty, UserRole.SuperAdmin);
        existing.SetAdminCredentials("existing", new Pbkdf2PasswordHasher().Hash("pass"));
        db.Users.Add(existing);
        await db.SaveChangesAsync();

        var seeder = new DbSeeder(db, new Pbkdf2PasswordHasher(), Configuration(new Dictionary<string, string?>()),
            Substitute.For<ILogger<DbSeeder>>());

        await seeder.SeedDefaultAdminAsync();

        db.Users.Count(u => u.AdminUsername != null).Should().Be(1);
        db.Users.Should().NotContain(u => u.AdminUsername == "admin");
    }

    [Fact]
    public async Task SeedDefaultAdminAsync_SkipsWhenUsernameMissingInConfig()
    {
        await using var db = CreateDbContext();
        var config = Configuration(new Dictionary<string, string?>
        {
            ["Database:SeedAdmin:Username"] = string.Empty,
        });
        var seeder = new DbSeeder(db, new Pbkdf2PasswordHasher(), config, Substitute.For<ILogger<DbSeeder>>());

        await seeder.SeedDefaultAdminAsync();

        db.Users.Should().BeEmpty();
    }
}