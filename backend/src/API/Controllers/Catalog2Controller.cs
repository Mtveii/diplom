using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SteamAdminPanel.Application.Contracts.Catalog;
using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Api.Controllers;

/// <summary>
/// Объединённый каталог игр из 4 источников (GOG + Epic + FreeToGame + SteamSpy).
/// Пагинация по страницам GOG; записи других источников связаны по нормализованному названию.
/// Порядок приоритета полей — по ТЗ (SteamSpy → GOG → Epic → FreeToGame).
/// </summary>
[ApiController]
[Route("api/catalog2")]
[Authorize]
[EnableRateLimiting("steam")]
public sealed class Catalog2Controller : ControllerBase
{
    private readonly IUnifiedGameCatalogService _catalogService;

    public Catalog2Controller(IUnifiedGameCatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    /// <summary>Страница объединённого каталога (40 игр): Redis → БД → GOG → мёрж источников.</summary>
    [HttpGet]
    public async Task<ActionResult<UnifiedCatalogPageDto>> GetPage(
        [FromQuery] int page = 1, CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            return BadRequest("page должен быть ≥ 1");
        }

        return Ok(await _catalogService.GetPageAsync(page, cancellationToken));
    }

    /// <summary>Детальные данные игры со страницы GOG (описание, системные требования) по URL-ссылке из карточки.</summary>
    [HttpGet("gog-details")]
    public async Task<ActionResult<GogGameDetailsDto?>> GetGogDetails(
        [FromQuery] string url, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url) || !url.StartsWith("https://www.gog.com", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("url должен быть ссылкой на страницу GOG");
        }

        return Ok(await _catalogService.GetGogGameDetailsAsync(url, cancellationToken));
    }

    /// <summary>Проверка, что малые источники (Epic/FreeToGame/SteamSpy) уже загружены в БД.</summary>
    [HttpGet("sources-status")]
    public async Task<ActionResult<bool>> GetSourcesStatus(CancellationToken cancellationToken)
    {
        return Ok(await _catalogService.AreSmallSourcesLoadedAsync(cancellationToken));
    }

    /// <summary>Принудительная перезагрузка малых источников (Epic/FreeToGame/SteamSpy) для админа.</summary>
    [HttpPost("sources/reload")]
    [Authorize(Policy = PolicyNames.SuperAdminOnly)]
    public async Task<ActionResult> ReloadSources(CancellationToken cancellationToken)
    {
        await _catalogService.ResetSmallSourcesAsync(cancellationToken);
        await _catalogService.LoadSmallSourcesAsync(cancellationToken);
        return Ok();
    }
}
