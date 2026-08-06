using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Members;

public sealed record ClanMemberDto(
    int Id,
    string SteamId64,
    string Username,
    string AvatarUrl,
    bool IsOnline,
    int? CurrentGameId,
    string? CurrentGameName,
    InternalRank InternalRank,
    MemberStatus Status,
    DateTime JoinedAt,
    long MinutesPlayedTotal,
    DateTime? LastSeenAt);