using Hangfire;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

public static class RecurringJobs
{
    public const string OnlineStatusJobId = "collect-online-statuses";
    public const string PlaytimeJobId = "collect-playtime";
    public const string GameStatsJobId = "collect-game-stats";
    public const string AlertEvaluationJobId = "evaluate-alerts";
    public const string WarningExpiryJobId = "expire-warnings";
    public const string WeeklyDigestJobId = "weekly-digest";
    public const string ExternalCatalogSourcesJobId = "load-external-catalog-sources";
    public const string CatalogGogBackfillJobId = "backfill-gog-catalog";

    /// <summary>
    /// Регистрация recurring jobs по ТЗ (раздел 4.4):
    /// 5 мин — статусы, 1 час — playtime, 1 сутки — снапшоты игр, 1 час — алерты, 1 сутки — варнинги, 1 неделя — дайджест.
    /// </summary>
    public static void Register(IRecurringJobManager manager)
    {
        manager.AddOrUpdate<OnlineStatusCollectionJob>(
            OnlineStatusJobId,
            job => job.RunAsync(),
            Cron.MinuteInterval(5),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

        manager.AddOrUpdate<PlaytimeCollectionJob>(
            PlaytimeJobId,
            job => job.RunAsync(),
            Cron.Hourly(),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

        manager.AddOrUpdate<GameStatsSnapshotJob>(
            GameStatsJobId,
            job => job.RunAsync(),
            Cron.Daily(2, 0),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

        manager.AddOrUpdate<AlertEvaluationJob>(
            AlertEvaluationJobId,
            job => job.RunAsync(),
            Cron.Hourly(5),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

        manager.AddOrUpdate<WarningExpiryJob>(
            WarningExpiryJobId,
            job => job.RunAsync(),
            Cron.Daily(3, 0),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

        manager.AddOrUpdate<WeeklyDigestJob>(
            WeeklyDigestJobId,
            job => job.RunAsync(),
            Cron.Weekly(DayOfWeek.Monday, 9, 0),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

        // Малые источники каталога грузим каждые 6 часов (идемпотентно, повторные прогоны пропускаются).
        manager.AddOrUpdate<ExternalCatalogSourcesJob>(
            ExternalCatalogSourcesJobId,
            job => job.RunAsync(),
            Cron.HourInterval(6),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

        // Фоновая докачка страниц GOG — раз в сутки (быстрый старт с 1-й страницы, дальше воркер идёт по нарастающей).
        manager.AddOrUpdate<CatalogGogBackfillJob>(
            CatalogGogBackfillJobId,
            job => job.RunAsync(),
            Cron.Daily(4, 0),
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
    }
}