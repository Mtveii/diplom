namespace SteamAdminPanel.Domain.Entities;

public sealed class PlayerStatusSnapshot
{
    private PlayerStatusSnapshot()
    {
    }

    public PlayerStatusSnapshot(string steamId64, bool isOnline, int? gameId, string? gameName,
        DateTime? timestamp = null)
    {
        SteamId64 = steamId64;
        IsOnline = isOnline;
        GameId = gameId;
        GameName = gameName;
        Timestamp = timestamp ?? DateTime.UtcNow;
    }

    public int Id { get; private set; }

    public string SteamId64 { get; private set; }

    public bool IsOnline { get; private set; }

    public int? GameId { get; private set; }

    public string? GameName { get; private set; }

    public DateTime Timestamp { get; private set; }
}