using SteamAdminPanel.Application.Contracts.Analytics;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Reporting;

/// <summary>
/// Фасад экспорта: PDF через QuestPDF, Excel через ClosedXML.
/// </summary>
public sealed class ReportExporter : IReportExporter
{
    private readonly QuestPdfReportExporter _pdf;
    private readonly ClosedXmlReportExporter _excel;

    public ReportExporter(QuestPdfReportExporter pdf, ClosedXmlReportExporter excel)
    {
        _pdf = pdf;
        _excel = excel;
    }

    public byte[] ExportPdf(IReadOnlyList<CohortRowDto> cohorts, IReadOnlyList<ChurnRiskDto> churnRisks,
        PeriodComparisonDto comparison)
    {
        return _pdf.ExportPdf(cohorts, churnRisks, comparison);
    }

    public byte[] ExportExcel(IReadOnlyList<CohortRowDto> cohorts, IReadOnlyList<ChurnRiskDto> churnRisks,
        PeriodComparisonDto comparison)
    {
        return _excel.ExportExcel(cohorts, churnRisks, comparison);
    }
}