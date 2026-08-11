using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Domain.Entities;

/// <summary>
/// Сырая запись каталога из одного внешнего источника (GOG / Epic / FreeToGame / SteamSpy).
/// Связанные записи из разных источников сливаются в карточку по NormalizedTitle.
/// </summary>
public sealed class CatalogGame
{
    private CatalogGame()
    {
    }

    public CatalogGame(CatalogSource source, string title, string normalizedTitle)
    {
        Source = source;
        Title = title;
        NormalizedTitle = normalizedTitle;
        UpdatedAt = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }

    public CatalogSource Source { get; private set; }

    public string Title { get; private set; }

    /// <summary>Нормализованное название — ключ связывания записей из разных источников.</summary>
    public string NormalizedTitle { get; private set; }

    // --- Идентификаторы источника (заполнен только один, соответствующий Source) ---

    public long? GogGameId { get; private set; }

    public int? GogPage { get; private set; }

    public string? EpicGameId { get; private set; }

    public int? FreeToGameId { get; private set; }

    public int? SteamAppId { get; private set; }

    // --- Поля записи ---
    public decimal? PriceCents { get; private set; }

    public bool IsFree => PriceCents is null or 0;

    public string? Description { get; private set; }

    public string? Image { get; private set; }

    public List<string> Gallery { get; private set; } = [];

    public string? Developer { get; private set; }

    public string? Publisher { get; private set; }

    public List<string> Genres { get; private set; } = [];

    public List<string> Platforms { get; private set; } = [];

    public decimal? PositiveReviewPercent { get; private set; }

    public string? OwnersEstimate { get; private set; }

    public string? ReleaseDate { get; private set; }

    public string? SourceUrlGog { get; private set; }

    public string? SourceUrlFreeToGame { get; private set; }

    public DateTime UpdatedAt { get; private set; }

    public void SetExternalFields(string? description, string? image, List<string> gallery, string? developer,
        string? publisher, List<string> genres, List<string> platforms, decimal? priceCents,
        decimal? positiveReviewPercent, string? ownersEstimate, string? releaseDate)
    {
        Description = description;
        Image = image;
        Gallery = gallery;
        Developer = developer;
        Publisher = publisher;
        Genres = genres;
        Platforms = platforms;
        PriceCents = priceCents;
        PositiveReviewPercent = positiveReviewPercent;
        OwnersEstimate = ownersEstimate;
        ReleaseDate = releaseDate;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetIdentifiers(long? gogGameId, int? gogPage, string? epicGameId, int? freeToGameId,
        int? steamAppId)
    {
        GogGameId = gogGameId;
        GogPage = gogPage;
        EpicGameId = epicGameId;
        FreeToGameId = freeToGameId;
        SteamAppId = steamAppId;
    }

    public void SetSourceUrls(string? gogUrl, string? freeToGameUrl)
    {
        SourceUrlGog = gogUrl;
        SourceUrlFreeToGame = freeToGameUrl;
        UpdatedAt = DateTime.UtcNow;
    }
}