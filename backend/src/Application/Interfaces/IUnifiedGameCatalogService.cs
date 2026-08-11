using SteamAdminPanel.Application.Contracts.Catalog;

namespace SteamAdminPanel.Application.Interfaces;

/// <summary>
/// Объединённый каталог игр из 4 источников (GOG + Epic + FreeToGame + SteamSpy),
/// связанных по нормализованному названию.
/// </summary>
public interface IUnifiedGameCatalogService
{
    /// <summary>Одна страница каталога: Redis → БД (страница GOG) → GOG напрямую → мёрж.</summary>
    Task<UnifiedCatalogPageDto> GetPageAsync(int page, CancellationToken cancellationToken = default);

    /// <summary>Детальные данные игры со страницы GOG (описание, системные требования): Redis → GOG.</summary>
    Task<GogGameDetailsDto?> GetGogGameDetailsAsync(string gogUrl, CancellationToken cancellationToken = default);

    /// <summary>Проверка, что малые источники (Epic/FreeToGame/SteamSpy) уже загружены в БД.</summary>
    Task<bool> AreSmallSourcesLoadedAsync(CancellationToken cancellationToken = default);

    /// <summary>Однократная загрузка малых источников (Epic/FreeToGame/SteamSpy) в БД.</summary>
    Task LoadSmallSourcesAsync(CancellationToken cancellationToken = default);

    /// <summary>Удаляет записи малых источников (Epic/FreeToGame/SteamSpy) перед перезагрузкой.</summary>
    Task ResetSmallSourcesAsync(CancellationToken cancellationToken = default);
}