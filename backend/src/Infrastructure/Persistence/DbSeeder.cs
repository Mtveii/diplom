using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Infrastructure.Persistence;

/// <summary>
/// Начальное наполнение БД: создаёт администратора по умолчанию, если в системе
/// ещё нет ни одной учётки с логином (Users.AdminUsername).
/// Логин/пароль берутся из конфигурации (Database:SeedAdmin), по умолчанию admin/admin.
/// </summary>
public sealed class DbSeeder
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DbSeeder> _logger;

    public DbSeeder(AppDbContext dbContext, IPasswordHasher passwordHasher, IConfiguration configuration,
        ILogger<DbSeeder> logger)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedDefaultAdminAsync(CancellationToken cancellationToken = default)
    {
        var hasAdminAccount = await _dbContext.Users.AnyAsync(u => u.AdminUsername != null, cancellationToken);
        if (hasAdminAccount)
        {
            return;
        }

        var username = _configuration["Database:SeedAdmin:Username"] ?? "admin";
        var password = _configuration["Database:SeedAdmin:Password"] ?? "admin";
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        var user = new User("0", username, string.Empty, UserRole.SuperAdmin);
        user.SetAdminCredentials(username, _passwordHasher.Hash(password));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogWarning("Создан администратор по умолчанию: {Username} (смените пароль!)", username);
    }
}