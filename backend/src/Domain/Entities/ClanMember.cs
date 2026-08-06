using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Domain.Entities;

public sealed class ClanMember
{
    private ClanMember()
    {
    }

    public ClanMember(string steamId64, InternalRank rank)
    {
        SteamId64 = steamId64;
        InternalRank = rank;
        JoinedAt = DateTime.UtcNow;
        Status = MemberStatus.Active;
    }

    public int Id { get; private set; }

    public string SteamId64 { get; private set; }

    public InternalRank InternalRank { get; private set; }

    public DateTime JoinedAt { get; private set; }

    public MemberStatus Status { get; private set; }

    public void SetRank(InternalRank rank)
    {
        InternalRank = rank;
    }

    public void SetStatus(MemberStatus status)
    {
        Status = status;
    }
}