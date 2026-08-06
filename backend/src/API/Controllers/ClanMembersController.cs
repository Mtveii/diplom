using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Application.Contracts.Members;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/members")]
[Authorize(Policy = PolicyNames.AdminOnly)]
public sealed class ClanMembersController : ControllerBase
{
    private readonly IClanMemberService _memberService;
    private readonly ICurrentUserAccessor _currentUser;

    public ClanMembersController(IClanMemberService memberService, ICurrentUserAccessor currentUser)
    {
        _memberService = memberService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ClanMemberDto>>> GetMembers(
        [FromQuery] string? search, [FromQuery] MemberStatus? status, [FromQuery] InternalRank? rank)
    {
        return Ok(await _memberService.GetAllAsync(search, status, rank, HttpContext.RequestAborted));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ClanMemberDto>> GetMember(int id)
    {
        return Ok(await _memberService.GetByIdAsync(id, HttpContext.RequestAborted));
    }

    [HttpPost]
    public async Task<ActionResult<ClanMemberDto>> CreateMember([FromBody] CreateMemberRequestDto request)
    {
        var (actorId, ip) = GetActor();
        var result = await _memberService.CreateAsync(request, actorId, ip, HttpContext.RequestAborted);
        return CreatedAtAction(nameof(GetMember), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}/rank")]
    public async Task<ActionResult<ClanMemberDto>> UpdateRank(int id, [FromBody] UpdateMemberRankRequestDto request)
    {
        var (actorId, _) = GetActor();
        return Ok(await _memberService.UpdateRankAsync(id, request, actorId, HttpContext.RequestAborted));
    }

    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<ClanMemberDto>> SetStatus(int id, [FromBody] SetMemberStatusRequestDto request)
    {
        var (actorId, _) = GetActor();
        return Ok(await _memberService.SetStatusAsync(id, request, actorId, HttpContext.RequestAborted));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteMember(int id)
    {
        var (actorId, _) = GetActor();
        await _memberService.DeleteAsync(id, actorId, HttpContext.RequestAborted);
        return NoContent();
    }

    [HttpPost("import/steam-group")]
    public async Task<ActionResult<int>> ImportFromSteamGroup([FromBody] string groupId)
    {
        var (actorId, _) = GetActor();
        var added = await _memberService.ImportBySteamGroupAsync(groupId, actorId, HttpContext.RequestAborted);
        return Ok(new { added });
    }

    [HttpGet("{id:int}/warnings")]
    public async Task<ActionResult<IReadOnlyList<MemberWarningDto>>> GetWarnings(int id)
    {
        return Ok(await _memberService.GetWarningsAsync(id, HttpContext.RequestAborted));
    }

    [HttpPost("warnings")]
    public async Task<ActionResult<MemberWarningDto>> IssueWarning([FromBody] IssueWarningRequestDto request)
    {
        var (actorId, _) = GetActor();
        return Ok(await _memberService.IssueWarningAsync(request, actorId, HttpContext.RequestAborted));
    }

    [HttpPost("warnings/{warningId:int}/deactivate")]
    public async Task<IActionResult> DeactivateWarning(int warningId)
    {
        await _memberService.DeactivateWarningAsync(warningId, HttpContext.RequestAborted);
        return NoContent();
    }

    [HttpGet("{id:int}/history")]
    public async Task<ActionResult<IReadOnlyList<MemberProfileHistoryDto>>> GetProfileHistory(int id)
    {
        return Ok(await _memberService.GetProfileHistoryAsync(id, 50, HttpContext.RequestAborted));
    }

    private (int ActorId, string? Ip) GetActor()
    {
        var actorId = _currentUser.UserId
                      ?? throw new Application.Exceptions.UnauthorizedException("Не авторизован.");
        return (actorId, _currentUser.IpAddress);
    }
}