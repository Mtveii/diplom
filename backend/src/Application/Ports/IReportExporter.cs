using SteamAdminPanel.Application.Contracts.Analytics;

namespace SteamAdminPanel.Application.Ports;

public interface IReportExporter
{
    byte[] ExportPdf(IReadOnlyList<CohortRowDto> cohorts, IReadOnlyList<ChurnRiskDto> churnRisks,
        PeriodComparisonDto comparison);

    byte[] ExportExcel(IReadOnlyList<CohortRowDto> cohorts, IReadOnlyList<ChurnRiskDto> churnRisks,
        PeriodComparisonDto comparison);
}