namespace SteamAdminPanel.Application.Contracts.Steam;

public sealed record SteamPlayerSummaryDto(
    string SteamId64,
    string? Nickname,
    string? AvatarUrl,
    string? AvatarMediumUrl,
    string? AvatarFullUrl,
    int PersonaState,
    string? GameId,
    string? GameExtraInfo,
    DateTime? LastLogOff,
    DateTime? LastSeen,
    bool? ProfileVisible);