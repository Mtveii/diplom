using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Domain.Entities;

public sealed class AlertRule
{
    private AlertRule()
    {
    }

    public AlertRule(AlertRuleType type, string? targetId, AlertCondition condition, decimal thresholdValue,
        bool isActive, string name)
    {
        Type = type;
        TargetId = targetId;
        Condition = condition;
        ThresholdValue = thresholdValue;
        IsActive = isActive;
        Name = name;
        CreatedAt = DateTime.UtcNow;
    }

    public int Id { get; private set; }

    public string Name { get; private set; }

    public AlertRuleType Type { get; private set; }

    /// <summary>
    /// Цель правила: SteamId64 участника, AppId игры или null для глобальных правил.
    /// </summary>
    public string? TargetId { get; private set; }

    public AlertCondition Condition { get; private set; }

    public decimal ThresholdValue { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public void Update(AlertRuleType type, string? targetId, AlertCondition condition, decimal thresholdValue,
        bool isActive, string name)
    {
        Type = type;
        TargetId = targetId;
        Condition = condition;
        ThresholdValue = thresholdValue;
        IsActive = isActive;
        Name = name;
    }
}