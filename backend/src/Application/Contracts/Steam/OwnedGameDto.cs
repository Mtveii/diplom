namespace SteamAdminPanel.Application.Contracts.Steam;

public sealed record OwnedGameDto(
    uint AppId,
    string? Name,
    long PlaytimeMinutesTotal,
    long PlaytimeMinutesLastTwoWeeks,
    string? LogoUrl);