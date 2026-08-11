using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Options;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>
/// Фоновая докачка страниц GOG в БД (страницы 1..GogMaxPages с задержкой между запросами).
/// Первый запрос пользователя к странице всё равно проксируется на GOG, если страницы ещё нет.
/// </summary>
public sealed class CatalogGogBackfillJob
{
    private readonly IUnifiedGameCatalogService _catalogService;
    private readonly CatalogOptions _options;
    private readonly ILogger<CatalogGogBackfillJob> _logger;

    public CatalogGogBackfillJob(IUnifiedGameCatalogService catalogService,
        IOptions<CatalogOptions> options, ILogger<CatalogGogBackfillJob> logger)
    {
        _catalogService = catalogService;
        _options = options.Value;
        _logger = logger;
    }

    public async Task RunAsync()
    {
        for (var page = 1; page <= _options.GogMaxPages; page++)
        {
            try
            {
                await _catalogService.GetPageAsync(page, CancellationToken.None);
                await Task.Delay(_options.GogPageDelayMs, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка докачки GOG-страницы {Page}, прерываем воркер", page);
                return;
            }
        }

        _logger.LogInformation("Докачка GOG завершена ({MaxPages} страниц)", _options.GogMaxPages);
    }
}