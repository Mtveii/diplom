using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Members;

public sealed record MemberWarningDto(
    int Id,
    int MemberId,
    int? IssuedByUserId,
    string? IssuedByUsername,
    string Reason,
    WarningSeverity Severity,
    DateTime IssuedAt,
    DateTime? ExpiresAt,
    bool IsActive);