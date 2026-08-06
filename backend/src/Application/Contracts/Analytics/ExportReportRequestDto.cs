namespace SteamAdminPanel.Application.Contracts.Analytics;

public enum ReportFormat
{
    Pdf = 0,
    Excel = 1
}

public sealed record ExportReportRequestDto(
    ReportFormat Format,
    DateTime? From,
    DateTime? To);