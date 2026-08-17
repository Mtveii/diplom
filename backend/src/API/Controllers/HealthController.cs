using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Application.Contracts.Health;
using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/health")]
[Authorize]
public sealed class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;

    public HealthController(IHealthService healthService)
    {
        _healthService = healthService;
    }

    [HttpGet]
    public async Task<ActionResult<SystemHealthDto>> GetHealth()
    {
        return Ok(await _healthService.GetHealthAsync(HttpContext.RequestAborted));
    }
}