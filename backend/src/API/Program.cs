using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using SteamAdminPanel.Api;
using SteamAdminPanel.Api.Hubs;
using SteamAdminPanel.Api.Middleware;
using SteamAdminPanel.Application;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Enums;
using SteamAdminPanel.Infrastructure;
using SteamAdminPanel.Infrastructure.BackgroundJobs;
using SteamAdminPanel.Infrastructure.Options;
using SteamAdminPanel.Infrastructure.Persistence;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
            options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "Steam Clan Admin Panel API",
            Version = "v1",
            Description = "Админ-панель для Steam-клана: мониторинг, алерты, аналитика."
        });

        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Вставьте JWT: 'Bearer {token}'"
        });

        options.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });

    // --- Слои ---
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);

    // --- Auth: JWT bearer ---
    var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
                     ?? new JwtOptions();
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtOptions.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtOptions.Audience,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
                ClockSkew = TimeSpan.FromSeconds(30)
            };

            // SignalR использует access token в query string.
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }

                    return Task.CompletedTask;
                }
            };
        });

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy(PolicyNames.AdminOnly, policy => policy
            .RequireRole(UserRole.SuperAdmin.ToString(), UserRole.Moderator.ToString()));
        options.AddPolicy(PolicyNames.AnalystOrAbove, policy => policy
            .RequireRole(UserRole.SuperAdmin.ToString(), UserRole.Moderator.ToString(),
                UserRole.Analyst.ToString()));
        options.AddPolicy(PolicyNames.SuperAdminOnly, policy => policy
            .RequireRole(UserRole.SuperAdmin.ToString()));
    });

    // --- Cors ---
    var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? "http://localhost:5173";
    builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy
        .WithOrigins(frontendOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

    // --- Real-time ---
    builder.Services.AddSignalR();

    // --- HttpContext / актор ---
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUserAccessor, CurrentUserAccessor>();
    builder.Services.AddScoped<IDashboardHubClient, DashboardHubNotifier>();

    // --- Rate limiting (троттлинг Steam API) ---
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.AddFixedWindowLimiter("steam", limiter =>
        {
            limiter.PermitLimit = 10;
            limiter.Window = TimeSpan.FromSeconds(1);
            limiter.QueueLimit = 0;
        });
        options.AddFixedWindowLimiter("default", limiter =>
        {
            limiter.PermitLimit = 100;
            limiter.Window = TimeSpan.FromSeconds(10);
            limiter.QueueLimit = 0;
        });
    });

    // --- Hangfire (фоновые джобы) ---
    var hangfireEnabled = builder.Configuration.GetValue<bool>("Hangfire:Enabled");
    if (hangfireEnabled)
    {
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                               ?? "Host=localhost;Port=5432;Database=steam_clan_admin;Username=postgres;Password=postgres";
        builder.Services.AddHangfire(configuration => configuration
            .UsePostgreSqlStorage(connectionString)
            .UseSerilogLogProvider());
        builder.Services.AddHangfireServer();
    }

    var app = builder.Build();

    // --- Миграции (опционально, только при явном включении) ---
    if (app.Configuration.GetValue<bool>("Database:AutoMigrate"))
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.Database.Migrate();
        Log.Information("Миграции применены.");
    }

    // --- Первичный администратор (admin/admin по умолчанию, создаётся один раз) ---
    if (app.Configuration.GetValue<bool>("Database:SeedAdmin:Enabled", true))
    {
        using var scope = app.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedDefaultAdminAsync();
    }

    app.UseMiddleware<ExceptionHandlingMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseCors("frontend");
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<DashboardHub>("/hubs/dashboard");

    if (hangfireEnabled)
    {
        app.UseHangfireDashboard("/hangfire", new DashboardOptions
        {
            DashboardTitle = "Steam Clan Admin Panel — Jobs"
        });
        RecurringJobs.Register(app.Services.GetRequiredService<IRecurringJobManager>());
    }

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Критическая ошибка при запуске приложения");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

namespace SteamAdminPanel.Api
{
    public static class PolicyNames
    {
        public const string AdminOnly = "AdminOnly";
        public const string AnalystOrAbove = "AnalystOrAbove";
        public const string SuperAdminOnly = "SuperAdminOnly";
    }
}