using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Members;

public sealed record MembershipApplicationDto(
    int Id,
    string SteamId64,
    string? Username,
    string? AvatarUrl,
    MembershipApplicationStatus Status,
    int? ReviewedByUserId,
    string? Comment,
    DateTime CreatedAt,
    DateTime? ReviewedAt);