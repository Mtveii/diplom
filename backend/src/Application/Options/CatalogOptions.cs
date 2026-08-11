namespace SteamAdminPanel.Application.Options;

/// <summary>Конфигурация объединённого каталога игр (4 источника + кэш).</summary>
public sealed class CatalogOptions
{
    public const string SectionName = "Catalog";

    public bool GogEnabled { get; set; } = true;

    public bool EpicEnabled { get; set; } = true;

    public bool FreeToGameEnabled { get; set; } = true;

    public bool SteamSpyEnabled { get; set; } = true;

    /// <summary>Максимальная страница GOG для фоновой докачки (всего ~400).</summary>
    public int GogMaxPages { get; set; } = 400;

    /// <summary>Задержка между страницами GOG в фоновом воркере (защита от rate limit).</summary>
    public int GogPageDelayMs { get; set; } = 400;

    /// <summary>TTL кэша страниц каталога в Redis.</summary>
    public int CacheTtlHours { get; set; } = 6;

    public int PageSize { get; set; } = 40;

    /// <summary>Сколько записей SteamSpy хранить (топ по CCU, весь каталог ~130k — слишком много).</summary>
    public int SteamSpyTopCount { get; set; } = 5000;
}
