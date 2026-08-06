using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Services;

namespace SteamAdminPanel.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddValidatorsFromAssembly(assembly);

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IClanMemberService, ClanMemberService>();
        services.AddScoped<IMembershipApplicationService, MembershipApplicationService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<ISteamService, SteamService>();
        services.AddScoped<ISnapshotService, SnapshotService>();
        services.AddScoped<IMonitoringService, MonitoringService>();
        services.AddScoped<IAlertService, AlertService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IGameCatalogService, GameCatalogService>();

        return services;
    }
}