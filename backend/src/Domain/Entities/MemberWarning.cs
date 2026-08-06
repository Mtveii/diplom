using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Domain.Entities;

public sealed class MemberWarning
{
    private MemberWarning()
    {
    }

    public MemberWarning(int memberId, int? issuedByUserId, string reason, WarningSeverity severity, DateTime? expiresAt)
    {
        MemberId = memberId;
        IssuedByUserId = issuedByUserId;
        Reason = reason;
        Severity = severity;
        ExpiresAt = expiresAt;
        IssuedAt = DateTime.UtcNow;
        IsActive = true;
    }

    public int Id { get; private set; }

    public int MemberId { get; private set; }

    public int? IssuedByUserId { get; private set; }

    public string Reason { get; private set; }

    public WarningSeverity Severity { get; private set; }

    public DateTime IssuedAt { get; private set; }

    public DateTime? ExpiresAt { get; private set; }

    public bool IsActive { get; private set; }

    public bool IsExpired => ExpiresAt.HasValue && ExpiresAt.Value < DateTime.UtcNow;

    public void Deactivate()
    {
        IsActive = false;
    }
}