using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Alerts;

public sealed record CreateAlertRuleRequestDto(
    string Name,
    AlertRuleType Type,
    string? TargetId,
    AlertCondition Condition,
    decimal ThresholdValue,
    bool IsActive);