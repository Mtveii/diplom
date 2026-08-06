using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Domain.Entities;

public sealed class AdminActionLog
{
    private AdminActionLog()
    {
    }

    public AdminActionLog(int? userId, AuditAction action, AuditEntityType entityType, string? entityId,
        string? oldValue, string? newValue, string? ipAddress)
    {
        UserId = userId;
        Action = action;
        EntityType = entityType;
        EntityId = entityId;
        OldValue = oldValue;
        NewValue = newValue;
        Timestamp = DateTime.UtcNow;
        IpAddress = ipAddress;
    }

    public int Id { get; private set; }

    public int? UserId { get; private set; }

    public AuditAction Action { get; private set; }

    public AuditEntityType EntityType { get; private set; }

    public string? EntityId { get; private set; }

    public string? OldValue { get; private set; }

    public string? NewValue { get; private set; }

    public DateTime Timestamp { get; private set; }

    public string? IpAddress { get; private set; }
}