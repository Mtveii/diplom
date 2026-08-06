using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Api;
using SteamAdminPanel.Application.Contracts.Analytics;
using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize(Policy = PolicyNames.AnalystOrAbove)]
public sealed class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    /// <summary>Retention участников (7/30/90 дней). days — окно когорты.</summary>
    [HttpGet("retention")]
    public async Task<ActionResult<IReadOnlyList<RetentionPointDto>>> GetRetention([FromQuery] int days = 90)
    {
        return Ok(await _analyticsService.GetRetentionAsync(days, HttpContext.RequestAborted));
    }

    /// <summary>Прогноз оттока (churn) — эвристика по дням без онлайна.</summary>
    [HttpGet("churn")]
    public async Task<ActionResult<IReadOnlyList<ChurnRiskDto>>> GetChurn([FromQuery] int thresholdDays = 14)
    {
        return Ok(await _analyticsService.GetChurnRiskAsync(thresholdDays, HttpContext.RequestAborted));
    }

    /// <summary>Сравнение периодов (неделя к неделе). currentDays — длина текущего окна.</summary>
    [HttpGet("compare")]
    public async Task<ActionResult<PeriodComparisonDto>> Compare([FromQuery] int currentDays = 7)
    {
        return Ok(await _analyticsService.ComparePeriodsAsync(currentDays, HttpContext.RequestAborted));
    }

    /// <summary>Когортный анализ по месяцу вступления.</summary>
    [HttpGet("cohorts")]
    public async Task<ActionResult<IReadOnlyList<CohortRowDto>>> GetCohorts([FromQuery] int months = 6)
    {
        return Ok(await _analyticsService.GetCohortsAsync(months, HttpContext.RequestAborted));
    }

    /// <summary>Экспорт отчёта в PDF/Excel.</summary>
    [HttpPost("export")]
    public async Task<IActionResult> Export([FromBody] ExportReportRequestDto request)
    {
        var result = await _analyticsService.ExportReportAsync(request, HttpContext.RequestAborted);
        return File(result.Content, result.ContentType, result.FileName);
    }
}