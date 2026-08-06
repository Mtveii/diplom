namespace SteamAdminPanel.Domain.Entities;

public sealed class AlertHistory
{
    private AlertHistory()
    {
    }

    public AlertHistory(int ruleId, string message)
    {
        RuleId = ruleId;
        Message = message;
        TriggeredAt = DateTime.UtcNow;
        IsRead = false;
    }

    public int Id { get; private set; }

    public int RuleId { get; private set; }

    public DateTime TriggeredAt { get; private set; }

    public string Message { get; private set; }

    public bool IsRead { get; private set; }

    public void MarkAsRead()
    {
        IsRead = true;
    }
}