namespace SteamAdminPanel.Domain.Entities;

public sealed class PlaytimeSnapshot
{
    private PlaytimeSnapshot()
    {
    }

    public PlaytimeSnapshot(string steamId64, uint appId, long minutesTotal, long minutesLastTwoWeeks)
    {
        SteamId64 = steamId64;
        AppId = appId;
        MinutesTotal = minutesTotal;
        MinutesLastTwoWeeks = minutesLastTwoWeeks;
        Timestamp = DateTime.UtcNow;
    }

    public int Id { get; private set; }

    public string SteamId64 { get; private set; }

    public uint AppId { get; private set; }

    public long MinutesTotal { get; private set; }

    public long MinutesLastTwoWeeks { get; private set; }

    public DateTime Timestamp { get; private set; }
}