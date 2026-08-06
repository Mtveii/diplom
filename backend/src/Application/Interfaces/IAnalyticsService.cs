using SteamAdminPanel.Application.Contracts.Analytics;

namespace SteamAdminPanel.Application.Interfaces;

public interface IAnalyticsService
{
    Task<IReadOnlyList<RetentionPointDto>> GetRetentionAsync(int days,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChurnRiskDto>> GetChurnRiskAsync(int inactivityDaysThreshold = 14,
        CancellationToken cancellationToken = default);

    Task<PeriodComparisonDto> ComparePeriodsAsync(int currentDays,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CohortRowDto>> GetCohortsAsync(int months,
        CancellationToken cancellationToken = default);

    Task<ReportExportResultDto> ExportReportAsync(ExportReportRequestDto request,
        CancellationToken cancellationToken = default);
}

public sealed record ReportExportResultDto(string FileName, string ContentType, byte[] Content);