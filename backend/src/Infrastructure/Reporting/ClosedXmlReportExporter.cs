using ClosedXML.Excel;
using SteamAdminPanel.Application.Contracts.Analytics;

namespace SteamAdminPanel.Infrastructure.Reporting;

public sealed class ClosedXmlReportExporter
{
    public byte[] ExportExcel(IReadOnlyList<CohortRowDto> cohorts, IReadOnlyList<ChurnRiskDto> churnRisks,
        PeriodComparisonDto comparison)
    {
        using var workbook = new XLWorkbook();

        var summary = workbook.Worksheets.Add("Сводка");
        summary.Cell(1, 1).Value = "Показатель";
        summary.Cell(1, 2).Value = "Текущий период";
        summary.Cell(1, 3).Value = "Предыдущий период";
        summary.Cell(1, 4).Value = "Изменение, %";
        summary.Row(1).Style.Font.Bold = true;

        summary.Cell(2, 1).Value = "Активные игроки";
        summary.Cell(2, 2).Value = comparison.CurrentActivePlayers;
        summary.Cell(2, 3).Value = comparison.PreviousActivePlayers;
        summary.Cell(2, 4).Value = comparison.ActivePlayersChangePercent;

        summary.Cell(3, 1).Value = "Playtime, минут";
        summary.Cell(3, 2).Value = comparison.CurrentPlaytimeMinutes;
        summary.Cell(3, 3).Value = comparison.PreviousPlaytimeMinutes;
        summary.Cell(3, 4).Value = comparison.PlaytimeChangePercent;

        summary.Cell(4, 1).Value = "Средний онлайн";
        summary.Cell(4, 2).Value = comparison.CurrentAverageDailyOnline;
        summary.Cell(4, 3).Value = comparison.PreviousAverageDailyOnline;
        summary.Cell(4, 4).Value = comparison.AverageOnlineChangePercent;

        var cohortSheet = workbook.Worksheets.Add("Когорты");
        cohortSheet.Cell(1, 1).Value = "Когорта";
        cohortSheet.Cell(1, 2).Value = "Размер";
        cohortSheet.Cell(1, 3).Value = "Retention 7д";
        cohortSheet.Cell(1, 4).Value = "Retention 30д";
        cohortSheet.Cell(1, 5).Value = "Retention 90д";
        cohortSheet.Row(1).Style.Font.Bold = true;

        var row = 2;
        foreach (var cohort in cohorts)
        {
            cohortSheet.Cell(row, 1).Value = cohort.CohortMonth;
            cohortSheet.Cell(row, 2).Value = cohort.CohortSize;
            var pointByDay = cohort.Points.ToDictionary(x => x.Day, x => x.RetainedPercent);
            cohortSheet.Cell(row, 3).Value = pointByDay.GetValueOrDefault(7, 0);
            cohortSheet.Cell(row, 4).Value = pointByDay.GetValueOrDefault(30, 0);
            cohortSheet.Cell(row, 5).Value = pointByDay.GetValueOrDefault(90, 0);
            row++;
        }

        var churnSheet = workbook.Worksheets.Add("Churn риск");
        churnSheet.Cell(1, 1).Value = "Участник";
        churnSheet.Cell(1, 2).Value = "Дней без онлайна";
        churnSheet.Cell(1, 3).Value = "Риск";
        churnSheet.Row(1).Style.Font.Bold = true;

        row = 2;
        foreach (var risk in churnRisks)
        {
            churnSheet.Cell(row, 1).Value = risk.Username;
            churnSheet.Cell(row, 2).Value = risk.DaysWithoutLogin;
            churnSheet.Cell(row, 3).Value = risk.RiskScore;
            row++;
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}