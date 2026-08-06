using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Infrastructure.Authentication;
using SteamAdminPanel.Infrastructure.Caching;
using SteamAdminPanel.Infrastructure.Notifications;
using SteamAdminPanel.Infrastructure.Options;
using SteamAdminPanel.Infrastructure.Persistence;
using SteamAdminPanel.Infrastructure.Persistence.Queries;
using SteamAdminPanel.Infrastructure.Reporting;
using SteamAdminPanel.Infrastructure.Steam;
using SteamAdminPanel.Infrastructure.Time;

namespace SteamAdminPanel.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations();
        services.AddOptions<SteamOptions>()
            .Bind(configuration.GetSection(SteamOptions.SectionName));
        services.AddOptions<RedisOptions>()
            .Bind(configuration.GetSection(RedisOptions.SectionName));
        services.AddOptions<NotificationOptions>()
            .Bind(configuration.GetSection(NotificationOptions.SectionName));
        services.AddOptions<FreeToGameOptions>()
            .Bind(configuration.GetSection(FreeToGameOptions.SectionName));

        // --- Persistence ---
        var connectionString = configuration.GetConnectionString("DefaultConnection")
                               ?? "Host=localhost;Port=5432;Database=steam_clan_admin;Username=postgres;Password=postgres";
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        services.AddScoped<IMonitoringQueries, MonitoringQueries>();
        services.AddScoped<IAnalyticsQueries, AnalyticsQueries>();
        services.AddScoped<DbSeeder>();

        // --- Clocks / cache ---
        services.AddSingleton<IClock, SystemClock>();
        services.AddStackExchangeRedisCache(options =>
            options.Configuration = configuration.GetSection(RedisOptions.SectionName)["ConnectionString"]);
        services.AddScoped<ICacheService, RedisCacheService>();

        // --- Auth ---
        services.AddScoped<ITokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IPasswordHasher, Pbkdf2PasswordHasher>();

        // --- Steam ---
        services.AddHttpClient<ISteamOpenIdClient, SteamOpenIdClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });
        services.AddHttpClient<ISteamApiClient, SteamApiClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("SteamClanAdminPanel/1.0");
        });
        services.AddHttpClient<IFreeToGameClient, FreeToGameClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(25);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("SteamClanAdminPanel/1.0");
        });
        services.AddHttpClient<ISteamSpyCatalogClient, SteamSpyCatalogClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(60);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("SteamClanAdminPanel/1.0");
        });

        // --- Notifications ---
        services.AddScoped<INotificationDispatcher, NotificationDispatcher>();
        services.AddScoped<INotificationSender, DiscordSender>();
        services.AddScoped<INotificationSender, TelegramSender>();
        services.AddScoped<INotificationSender, EmailSender>();
        services.AddScoped<INotificationSender, InAppSender>();
        services.AddHttpClient<DiscordSender>();
        services.AddHttpClient<TelegramSender>();

        // --- Reporting ---
        services.AddScoped<QuestPdfReportExporter>();
        services.AddScoped<ClosedXmlReportExporter>();
        services.AddScoped<IReportExporter, ReportExporter>();

        return services;
    }
}