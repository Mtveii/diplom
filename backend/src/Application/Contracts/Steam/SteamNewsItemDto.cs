namespace SteamAdminPanel.Application.Contracts.Steam;

public sealed record SteamNewsItemDto(
    long Id,
    string? Title,
    string? Url,
    string? Author,
    DateTime? Date,
    string? FeedLabel);