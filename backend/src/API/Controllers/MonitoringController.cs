using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Application.Contracts.Monitoring;
using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/monitoring")]
[Authorize]
public sealed class MonitoringController : ControllerBase
{
    private readonly IMonitoringService _monitoringService;

    public MonitoringController(IMonitoringService monitoringService)
    {
        _monitoringService = monitoringService;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        return Ok(await _monitoringService.GetDashboardSummaryAsync(HttpContext.RequestAborted));
    }

    /// <summary>Участники, находящиеся сейчас в сети (текущий снапшот).</summary>
    [HttpGet("online")]
    public async Task<ActionResult<IReadOnlyList<OnlineStatusDto>>> GetOnlineMembers()
    {
        return Ok(await _monitoringService.GetOnlineMembersAsync(HttpContext.RequestAborted));
    }

    /// <summary>График активности (line chart). period: day | week | month.</summary>
    [HttpGet("activity")]
    public async Task<ActionResult<IReadOnlyList<ActivityPointDto>>> GetActivity([FromQuery] string period = "week")
    {
        return Ok(await _monitoringService.GetActivitySeriesAsync(period, HttpContext.RequestAborted));
    }

    /// <summary>Heatmap активности по часам/дням недели.</summary>
    [HttpGet("heatmap")]
    public async Task<ActionResult<IReadOnlyList<HeatmapPointDto>>> GetHeatmap([FromQuery] int days = 30)
    {
        return Ok(await _monitoringService.GetHeatmapAsync(days, HttpContext.RequestAborted));
    }

    /// <summary>Топ-N игроков по playtime за период.</summary>
    [HttpGet("top-players")]
    public async Task<ActionResult<IReadOnlyList<TopPlayerDto>>> GetTopPlayers(
        [FromQuery] string period = "week", [FromQuery] int limit = 10)
    {
        return Ok(await _monitoringService.GetTopPlayersAsync(period, limit, HttpContext.RequestAborted));
    }

    /// <summary>Мониторинг конкретной игры: тренд цены/скидок/ревью + сравнение ачивок.</summary>
    [HttpGet("games/{appId:long}")]
    public async Task<ActionResult<GameMonitorDto>> GetGameMonitor(long appId)
    {
        return Ok(await _monitoringService.GetGameMonitorAsync((uint)appId, HttpContext.RequestAborted));
    }
}