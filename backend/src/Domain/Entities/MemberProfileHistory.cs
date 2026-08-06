namespace SteamAdminPanel.Domain.Entities;

public sealed class MemberProfileHistory
{
    private MemberProfileHistory()
    {
    }

    public MemberProfileHistory(int memberId, string field, string? oldValue, string? newValue)
    {
        MemberId = memberId;
        Field = field;
        OldValue = oldValue;
        NewValue = newValue;
        ChangedAt = DateTime.UtcNow;
    }

    public int Id { get; private set; }

    public int MemberId { get; private set; }

    public string Field { get; private set; }

    public string? OldValue { get; private set; }

    public string? NewValue { get; private set; }

    public DateTime ChangedAt { get; private set; }
}