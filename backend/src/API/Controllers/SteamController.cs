using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SteamAdminPanel.Application.Contracts.Steam;
using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Api.Controllers;

/// <summary>
/// Прямой доступ к данным Steam (для форм импорта и мониторинга игр).
/// Endpoints покрыты rate limiting'ом — у Steam есть лимиты на API.
/// </summary>
[ApiController]
[Route("api/steam")]
[Authorize]
[EnableRateLimiting("steam")]
public sealed class SteamController : ControllerBase
{
    private readonly ISteamService _steamService;

    public SteamController(ISteamService steamService)
    {
        _steamService = steamService;
    }

    /// <summary>Профили игроков Steam (ник, аватар, онлайн-статус, игра).</summary>
    [HttpGet("players")]
    public async Task<ActionResult<IReadOnlyList<SteamPlayerSummaryDto>>> GetPlayers([FromQuery] string steamIds)
    {
        var ids = steamIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return Ok(await _steamService.GetPlayerSummariesAsync(ids, HttpContext.RequestAborted));
    }

    /// <summary>Библиотека игр участника (appid, playtime).</summary>
    [HttpGet("players/{steamId}/games")]
    public async Task<ActionResult<IReadOnlyList<OwnedGameDto>>> GetPlayerGames(string steamId)
    {
        return Ok(await _steamService.GetOwnedGamesAsync(steamId, HttpContext.RequestAborted));
    }

    /// <summary>Поиск игры по имени (кэшированный AppList).</summary>
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<GameSearchResultDto>>> Search([FromQuery] string query,
        [FromQuery] int limit = 20)
    {
        var results = await _steamService.SearchGamesAsync(query, limit, HttpContext.RequestAborted);
        return Ok(results.Select(x => new GameSearchResultDto(x.AppId, x.Name)).ToList());
    }

    /// <summary>Новости по игре.</summary>
    [HttpGet("games/{appId:long}/news")]
    public async Task<ActionResult<IReadOnlyList<SteamNewsItemDto>>> GetNews(long appId)
    {
        return Ok(await _steamService.GetNewsAsync((uint)appId, HttpContext.RequestAborted));
    }

    /// <summary>Глобальные проценты выполнения ачивок по игре.</summary>
    [HttpGet("games/{appId:long}/achievements")]
    public async Task<ActionResult<IReadOnlyList<AchievementPercentDto>>> GetGlobalAchievements(long appId)
    {
        return Ok(await _steamService.GetGlobalAchievementsAsync((uint)appId, HttpContext.RequestAborted));
    }
}

public sealed record GameSearchResultDto(uint AppId, string Name);