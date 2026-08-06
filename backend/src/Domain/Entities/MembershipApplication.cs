using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Domain.Entities;

public sealed class MembershipApplication
{
    private MembershipApplication()
    {
    }

    public MembershipApplication(string steamId64)
    {
        SteamId64 = steamId64;
        Status = MembershipApplicationStatus.Pending;
        CreatedAt = DateTime.UtcNow;
    }

    public int Id { get; private set; }

    public string SteamId64 { get; private set; }

    public MembershipApplicationStatus Status { get; private set; }

    public int? ReviewedByUserId { get; private set; }

    public string? Comment { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? ReviewedAt { get; private set; }

    public void Approve(int reviewerId, string? comment)
    {
        Status = MembershipApplicationStatus.Approved;
        ReviewedByUserId = reviewerId;
        Comment = comment;
        ReviewedAt = DateTime.UtcNow;
    }

    public void Reject(int reviewerId, string? comment)
    {
        Status = MembershipApplicationStatus.Rejected;
        ReviewedByUserId = reviewerId;
        Comment = comment;
        ReviewedAt = DateTime.UtcNow;
    }
}