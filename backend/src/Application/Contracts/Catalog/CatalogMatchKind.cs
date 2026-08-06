namespace SteamAdminPanel.Application.Contracts.Catalog;

/// <summary>Результат мёрджа источников для карточки каталога.</summary>
public enum CatalogMatchKind
{
    /// <summary>Игра есть только в FreeToGame — SteamSpy-поля показываются заглушками.</summary>
    FreeToGameOnly,

    /// <summary>Игра найдена и в FreeToGame, и в SteamSpy — поля объединены.</summary>
    MatchedWithSteamSpy,
}
