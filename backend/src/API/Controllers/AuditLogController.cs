using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Api;
using SteamAdminPanel.Application.Contracts.Common;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Policy = PolicyNames.SuperAdminOnly)]
public sealed class AuditLogController : ControllerBase
{
    private readonly IAuditService _auditService;

    public AuditLogController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    /// <summary>Журнал действий администраторов.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResultDto<AdminActionLog>>> GetLogs(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] AuditEntityType? entityType = null)
    {
        return Ok(await _auditService.GetLogsAsync(page, pageSize, entityType, HttpContext.RequestAborted));
    }
}