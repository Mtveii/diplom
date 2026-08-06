using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Api;
using SteamAdminPanel.Application.Contracts.Alerts;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/alerts")]
[Authorize(Policy = PolicyNames.AdminOnly)]
public sealed class AlertsController : ControllerBase
{
    private readonly IAlertService _alertService;
    private readonly ICurrentUserAccessor _currentUser;

    public AlertsController(IAlertService alertService, ICurrentUserAccessor currentUser)
    {
        _alertService = alertService;
        _currentUser = currentUser;
    }

    [HttpGet("rules")]
    public async Task<ActionResult<IReadOnlyList<AlertRuleDto>>> GetRules()
    {
        return Ok(await _alertService.GetRulesAsync(HttpContext.RequestAborted));
    }

    [HttpPost("rules")]
    public async Task<ActionResult<AlertRuleDto>> CreateRule([FromBody] CreateAlertRuleRequestDto request)
    {
        var actorId = _currentUser.UserId ?? 0;
        return Ok(await _alertService.CreateRuleAsync(request, actorId, HttpContext.RequestAborted));
    }

    [HttpPut("rules/{id:int}")]
    public async Task<ActionResult<AlertRuleDto>> UpdateRule(int id, [FromBody] UpdateAlertRuleRequestDto request)
    {
        var actorId = _currentUser.UserId ?? 0;
        return Ok(await _alertService.UpdateRuleAsync(id, request, actorId, HttpContext.RequestAborted));
    }

    [HttpPatch("rules/{id:int}/toggle")]
    public async Task<ActionResult<AlertRuleDto>> ToggleRule(int id, [FromQuery] bool isActive)
    {
        return Ok(await _alertService.ToggleRuleAsync(id, isActive, HttpContext.RequestAborted));
    }

    [HttpDelete("rules/{id:int}")]
    public async Task<IActionResult> DeleteRule(int id)
    {
        await _alertService.DeleteRuleAsync(id, HttpContext.RequestAborted);
        return NoContent();
    }

    [HttpGet("history")]
    public async Task<ActionResult<IReadOnlyList<AlertHistoryDto>>> GetHistory(
        [FromQuery] int limit = 100, [FromQuery] bool unreadOnly = false)
    {
        return Ok(await _alertService.GetHistoryAsync(limit, unreadOnly, HttpContext.RequestAborted));
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
    {
        return Ok(await _alertService.GetUnreadCountAsync(HttpContext.RequestAborted));
    }

    [HttpPost("history/{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        await _alertService.MarkAsReadAsync(id, HttpContext.RequestAborted);
        return NoContent();
    }

    [HttpPost("history/read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        await _alertService.MarkAllAsReadAsync(HttpContext.RequestAborted);
        return NoContent();
    }

    [HttpPost("evaluate")]
    public async Task<ActionResult<int>> EvaluateNow()
    {
        return Ok(await _alertService.EvaluateAllRulesAsync(HttpContext.RequestAborted));
    }
}