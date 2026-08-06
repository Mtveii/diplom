using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Api;
using SteamAdminPanel.Application.Contracts.Common;
using SteamAdminPanel.Application.Contracts.Users;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = PolicyNames.AdminOnly)]
public sealed class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ICurrentUserAccessor _currentUser;

    public UsersController(IUserService userService, ICurrentUserAccessor currentUser)
    {
        _userService = userService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<UserDto>>> GetUsers(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
    {
        var result = await _userService.GetUsersAsync(page, pageSize, search, HttpContext.RequestAborted);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> GetUser(int id)
    {
        return Ok(await _userService.GetByIdAsync(id, HttpContext.RequestAborted));
    }

    [HttpPut("{id:int}/role")]
    [Authorize(Policy = PolicyNames.SuperAdminOnly)]
    public async Task<ActionResult<UserDto>> UpdateRole(int id, [FromBody] UpdateUserRoleRequestDto request)
    {
        var actorUserId = _currentUser.UserId
                          ?? throw new Application.Exceptions.UnauthorizedException("Не авторизован.");
        return Ok(await _userService.UpdateRoleAsync(id, request.Role, actorUserId, HttpContext.RequestAborted));
    }
}