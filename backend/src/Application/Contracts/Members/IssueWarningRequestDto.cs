using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Members;

public sealed record IssueWarningRequestDto(
    int MemberId,
    string Reason,
    WarningSeverity Severity,
    DateTime? ExpiresAt,
    int? BanForDays,
    int? MuteForDays);