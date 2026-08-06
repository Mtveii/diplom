namespace SteamAdminPanel.Application.Contracts.Alerts;

public sealed record AlertHistoryDto(
    int Id,
    int RuleId,
    string RuleName,
    DateTime TriggeredAt,
    string Message,
    bool IsRead);