namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Игра из раздела бесплатных раздач Epic Games Store (freeGamesPromotions).</summary>
public sealed record EpicGameDto(
    string Id,
    string Title,
    string? Description,
    DateTime? EffectiveDate,
    string? OriginalPriceText,
    decimal? DiscountPriceCents,
    string? Image,
    string? SellerName,
    string? DeveloperName);
