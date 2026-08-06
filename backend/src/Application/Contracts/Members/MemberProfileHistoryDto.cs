namespace SteamAdminPanel.Application.Contracts.Members;

public sealed record MemberProfileHistoryDto(
    int Id,
    int MemberId,
    string Field,
    string? OldValue,
    string? NewValue,
    DateTime ChangedAt);