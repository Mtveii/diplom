using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>
/// Однократная загрузка малых источников объединённого каталога (Epic/FreeToGame/SteamSpy) в БД.
/// Идемпотентно: повторные запуски пропускают уже загруженные источники.
/// </summary>
public sealed class ExternalCatalogSourcesJob
{
    private readonly IUnifiedGameCatalogService _catalogService;
    private readonly ILogger<ExternalCatalogSourcesJob> _logger;

    public ExternalCatalogSourcesJob(IUnifiedGameCatalogService catalogService,
        ILogger<ExternalCatalogSourcesJob> logger)
    {
        _catalogService = catalogService;
        _logger = logger;
    }

    public async Task RunAsync()
    {
        try
        {
            await _catalogService.LoadSmallSourcesAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка загрузки малых источников каталога");
        }
    }
}