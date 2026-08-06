using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SteamAdminPanel.Application.Contracts.Analytics;

namespace SteamAdminPanel.Infrastructure.Reporting;

public sealed class QuestPdfReportExporter
{
    static QuestPdfReportExporter()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] ExportPdf(IReadOnlyList<CohortRowDto> cohorts, IReadOnlyList<ChurnRiskDto> churnRisks,
        PeriodComparisonDto comparison)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(20);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Text("Отчёт по клану — аналитика активности")
                    .FontSize(16).SemiBold().FontColor(Colors.Blue.Darken3);

                page.Content().Column(column =>
                {
                    column.Spacing(12);

                    column.Item().Text($"Период сравнения: {comparison.CurrentPeriodStart:dd.MM.yyyy} — " +
                                       $"{comparison.CurrentPeriodEnd:dd.MM.yyyy} (предыдущий: " +
                                       $"{comparison.PreviousPeriodStart:dd.MM.yyyy} — {comparison.PreviousPeriodEnd:dd.MM.yyyy})");

                    column.Item().Text(
                        $"Активные игроки: {comparison.CurrentActivePlayers} " +
                        $"({comparison.ActivePlayersChangePercent:+#.#;-#.#;0}% к прошлому периоду); " +
                        $"playtime: {comparison.CurrentPlaytimeMinutes / 60:F0} ч; " +
                        $"средний онлайн: {comparison.CurrentAverageDailyOnline:F1} " +
                        $"({comparison.AverageOnlineChangePercent:+#.#;-#.#;0}%)");

                    column.Item().PaddingTop(4).Text("Когортный анализ (retention)")
                        .FontSize(13).SemiBold();

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(70);
                            columns.ConstantColumn(50);
                            foreach (var _ in RetentionDayColumns())
                            {
                                columns.ConstantColumn(70);
                            }
                        });

                        table.Header(header =>
                        {
                            header.Cell().Text("Когорта").SemiBold();
                            header.Cell().Text("Размер").SemiBold();
                            foreach (var day in RetentionDayColumns())
                            {
                                header.Cell().Text($"{day} дн.").SemiBold();
                            }
                        });

                        foreach (var cohort in cohorts)
                        {
                            table.Cell().Text(cohort.CohortMonth);
                            table.Cell().Text(cohort.CohortSize.ToString());
                            foreach (var point in cohort.Points)
                            {
                                table.Cell().Text($"{point.RetainedPercent:F1}%");
                            }
                        }
                    });

                    column.Item().PaddingTop(4).Text("Риск оттока (churn)")
                        .FontSize(13).SemiBold();

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(180);
                            columns.ConstantColumn(120);
                            columns.ConstantColumn(90);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Text("Участник").SemiBold();
                            header.Cell().Text("Дней без онлайна").SemiBold();
                            header.Cell().Text("Риск").SemiBold();
                        });

                        foreach (var risk in churnRisks.Take(20))
                        {
                            table.Cell().Text(risk.Username);
                            table.Cell().Text(risk.DaysWithoutLogin.ToString());
                            table.Cell().Text($"{risk.RiskScore * 100:F0}%");
                        }
                    });

                    column.Item().PaddingTop(8)
                        .Text($"Сформировано: {DateTime.UtcNow:g} UTC").FontSize(9).FontColor(Colors.Grey.Darken2);
                });

                page.Footer().AlignRight().Text(x =>
                {
                    x.DefaultTextStyle(style => style.FontSize(9).FontColor(Colors.Grey.Darken2));
                    x.CurrentPageNumber();
                });
            });
        }).GeneratePdf();
    }

    private static IEnumerable<int> RetentionDayColumns()
    {
        return new[] { 7, 30, 90 };
    }
}