using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Api.Controllers;

/// <summary>
/// Каталог игр: мёрж FreeToGame (все 413 игр) + SteamSpy (топ-1000 по онлайну).
/// Каждый запрос обновляет данные из внешних источников — без кэша и БД.
/// </summary>
[ApiController]
[Route("api/catalog")]
[Authorize]
[EnableRateLimiting("steam")]
public sealed class CatalogController : ControllerBase
{
    private readonly IGameCatalogService _catalogService;

    public CatalogController(IGameCatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    /// <summary>Список каталога: игры FreeToGame, обогащённые SteamSpy при совпадении названий.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CatalogListItemDto>>> GetCatalog(
        CancellationToken cancellationToken)
    {
        return Ok(await _catalogService.GetCatalogAsync(cancellationToken));
    }

    /// <summary>Детальная страница игры: описание, скриншоты, требования + SteamSpy-статистика.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<CatalogGameDetailDto>> GetGame(int id, CancellationToken cancellationToken)
    {
        return Ok(await _catalogService.GetGameByIdAsync(id, cancellationToken));
    }
}