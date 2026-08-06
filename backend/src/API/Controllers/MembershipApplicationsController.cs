using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Application.Contracts.Members;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/applications")]
public sealed class MembershipApplicationsController : ControllerBase
{
    private readonly IMembershipApplicationService _applicationService;
    private readonly ICurrentUserAccessor _currentUser;

    public MembershipApplicationsController(IMembershipApplicationService applicationService,
        ICurrentUserAccessor currentUser)
    {
        _applicationService = applicationService;
        _currentUser = currentUser;
    }

    /// <summary>Подать заявку на вступление (публично, без авторизации).</summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<MembershipApplicationDto>> Submit(
        [FromBody] SubmitApplicationRequestDto request)
    {
        return Ok(await _applicationService.SubmitAsync(request, HttpContext.RequestAborted));
    }

    [HttpGet]
    [Authorize(Policy = PolicyNames.AdminOnly)]
    public async Task<ActionResult<IReadOnlyList<MembershipApplicationDto>>> GetAll()
    {
        return Ok(await _applicationService.GetAllAsync(HttpContext.RequestAborted));
    }

    [HttpPut("{id:int}/review")]
    [Authorize(Policy = PolicyNames.AdminOnly)]
    public async Task<ActionResult<MembershipApplicationDto>> Review(int id,
        [FromBody] ReviewApplicationRequestDto request)
    {
        var reviewerId = _currentUser.UserId
                         ?? throw new Application.Exceptions.UnauthorizedException("Не авторизован.");
        return Ok(await _applicationService.ReviewAsync(id, request, reviewerId, HttpContext.RequestAborted));
    }
}