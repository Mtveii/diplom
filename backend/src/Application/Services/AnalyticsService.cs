using SteamAdminPanel.Application.Contracts.Analytics;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace SteamAdminPanel.Application.Services;

public sealed class AnalyticsService : IAnalyticsService
{
    private static readonly int[] RetentionDays = [0, 7, 30, 90];

    private readonly IAnalyticsQueries _queries;
    private readonly IRepository<ClanMember> _members;
    private readonly IRepository<User> _users;
    private readonly IReportExporter _reportExporter;
    private readonly IClock _clock;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(
        IAnalyticsQueries queries,
        IRepository<ClanMember> members,
        IRepository<User> users,
        IReportExporter reportExporter,
        IClock clock,
        ILogger<AnalyticsService> logger)
    {
        _queries = queries;
        _members = members;
        _users = users;
        _reportExporter = reportExporter;
        _clock = clock;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RetentionPointDto>> GetRetentionAsync(int days,
        CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var joinDates = await _queries.GetMemberJoinDatesAsync(cancellationToken);
        var cohort = joinDates
            .Where(x => x.JoinedAt >= now.AddDays(-days))
            .ToList();

        if (cohort.Count == 0)
        {
            return RetentionDays.Select(d => new RetentionPointDto(d, 0, 0)).ToList();
        }

        var cohortSize = cohort.Count;
        var points = new List<RetentionPointDto>(RetentionDays.Length);

        foreach (var day in RetentionDays)
        {
            if (day > days)
            {
                continue;
            }

            var retained = 0;
            foreach (var (steamId, joinedAt) in cohort)
            {
                var lastOnline = await _queries.GetLastOnlineAsync(steamId, cancellationToken);
                if (lastOnline is null)
                {
                    continue;
                }

                var required = joinedAt.AddDays(day);
                if (lastOnline.Value >= required)
                {
                    retained++;
                }
            }

            points.Add(new RetentionPointDto(day, (double)retained / cohortSize * 100.0, cohortSize));
        }

        return points;
    }

    public async Task<IReadOnlyList<ChurnRiskDto>> GetChurnRiskAsync(int inactivityDaysThreshold,
        CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var joinDates = await _queries.GetMemberJoinDatesAsync(cancellationToken);
        var steamIds = joinDates.Select(x => x.SteamId64).ToList();
        var users = steamIds.Count == 0
            ? Array.Empty<User>()
            : await _users.ListAsync(u => steamIds.Contains(u.SteamId64), cancellationToken);

        var results = new List<ChurnRiskDto>();
        foreach (var (steamId, _) in joinDates)
        {
            var lastOnline = await _queries.GetLastOnlineAsync(steamId, cancellationToken);
            if (lastOnline is null)
            {
                continue;
            }

            var daysWithoutLogin = (int)(now - lastOnline.Value).TotalDays;
            if (daysWithoutLogin <= inactivityDaysThreshold)
            {
                continue;
            }

            // Эвристика риска: 0.5 при достижении порога, 1.0 при двойном превышении.
            var excess = (double)daysWithoutLogin - inactivityDaysThreshold;
            var riskScore = Math.Min(1.0, 0.5 + excess / inactivityDaysThreshold);

            results.Add(new ChurnRiskDto(
                steamId,
                users.FirstOrDefault(u => u.SteamId64 == steamId)?.Username ?? $"Player_{steamId[^4..]}",
                daysWithoutLogin,
                Math.Round(riskScore, 2)));
        }

        return results.OrderByDescending(x => x.RiskScore).Take(50).ToList();
    }

    public async Task<PeriodComparisonDto> ComparePeriodsAsync(int currentDays,
        CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var currentStart = now.AddDays(-currentDays);
        var previousEnd = currentStart;
        var previousStart = previousEnd.AddDays(-currentDays);

        var currentActive = await _queries.GetActiveSteamIdsInRangeAsync(currentStart, now, cancellationToken);
        var previousActive = await _queries.GetActiveSteamIdsInRangeAsync(previousStart, previousEnd,
            cancellationToken);

        var currentDaily = await _queries.GetDailyOnlineCountsAsync(currentStart, now, cancellationToken);
        var previousDaily = await _queries.GetDailyOnlineCountsAsync(previousStart, previousEnd, cancellationToken);

        var currentPlaytime = await SumRecentPlaytimeAsync(now, cancellationToken);
        var previousPlaytime = await SumRecentPlaytimeAsync(previousEnd, cancellationToken);

        return new PeriodComparisonDto(
            currentStart,
            now,
            previousStart,
            previousEnd,
            currentActive.Count,
            previousActive.Count,
            ComputeChangePercent(currentActive.Count, previousActive.Count),
            currentPlaytime,
            previousPlaytime,
            ComputeChangePercent(currentPlaytime, previousPlaytime),
            AverageDailyOnline(currentDaily),
            AverageDailyOnline(previousDaily),
            ComputeChangePercent(AverageDailyOnline(currentDaily), AverageDailyOnline(previousDaily)));
    }

    public async Task<IReadOnlyList<CohortRowDto>> GetCohortsAsync(int months,
        CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var joinDates = await _queries.GetMemberJoinDatesAsync(cancellationToken);
        var cohortStart = new DateTime(now.Year, now.Month, 1).AddMonths(-months);

        var cohortGroups = joinDates
            .Where(x => x.JoinedAt >= cohortStart)
            .GroupBy(x => new DateTime(x.JoinedAt.Year, x.JoinedAt.Month, 1))
            .OrderBy(g => g.Key)
            .ToList();

        var rows = new List<CohortRowDto>();
        foreach (var group in cohortGroups)
        {
            var members = group.Select(x => (x.SteamId64, x.JoinedAt)).ToList();
            var points = new List<RetentionPointDto>();

            foreach (var day in RetentionDays.Skip(1))
            {
                var retained = 0;
                foreach (var (steamId, joinedAt) in members)
                {
                    var lastOnline = await _queries.GetLastOnlineAsync(steamId, cancellationToken);
                    if (lastOnline is not null && lastOnline.Value >= joinedAt.AddDays(day))
                    {
                        retained++;
                    }
                }

                points.Add(new RetentionPointDto(day, members.Count == 0 ? 0 :
                    (double)retained / members.Count * 100.0, members.Count));
            }

            rows.Add(new CohortRowDto(
                group.Key.ToString("yyyy-MM"),
                members.Count,
                points));
        }

        return rows;
    }

    public async Task<ReportExportResultDto> ExportReportAsync(ExportReportRequestDto request,
        CancellationToken cancellationToken)
    {
        var comparison = await ComparePeriodsAsync(30, cancellationToken);
        var cohorts = await GetCohortsAsync(6, cancellationToken);
        var churnRisks = await GetChurnRiskAsync(14, cancellationToken);

        byte[] content;
        switch (request.Format)
        {
            case ReportFormat.Pdf:
                content = _reportExporter.ExportPdf(cohorts, churnRisks, comparison);
                return new ReportExportResultDto("clan-report.pdf", "application/pdf", content);
            case ReportFormat.Excel:
                content = _reportExporter.ExportExcel(cohorts, churnRisks, comparison);
                return new ReportExportResultDto("clan-report.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content);
            default:
                throw new ArgumentOutOfRangeException(nameof(request.Format));
        }
    }

    private async Task<long> SumRecentPlaytimeAsync(DateTime asOf, CancellationToken cancellationToken)
    {
        var playtime = await _queries.GetLatestTwoWeekPlaytimePerMemberAsync(asOf, cancellationToken);
        _logger.LogDebug("Суммарный playtime на {AsOf}: {Minutes} минут", asOf, playtime.Values.Sum());
        return playtime.Values.Sum();
    }

    private static double ComputeChangePercent(double current, double previous)
    {
        if (previous == 0)
        {
            return current == 0 ? 0 : 100;
        }

        return (current - previous) / previous * 100.0;
    }

    private static double AverageDailyOnline(IReadOnlyList<int> counts)
    {
        if (counts.Count == 0)
        {
            return 0;
        }

        return counts.Average();
    }
}