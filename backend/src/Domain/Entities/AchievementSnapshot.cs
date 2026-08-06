namespace SteamAdminPanel.Domain.Entities;

public sealed class AchievementSnapshot
{
    private AchievementSnapshot()
    {
    }

    public AchievementSnapshot(string steamId64, uint appId, string achievementId, bool unlocked, DateTime? unlockedAt)
    {
        SteamId64 = steamId64;
        AppId = appId;
        AchievementId = achievementId;
        Unlocked = unlocked;
        UnlockedAt = unlockedAt;
        Timestamp = DateTime.UtcNow;
    }

    public int Id { get; private set; }

    public string SteamId64 { get; private set; }

    public uint AppId { get; private set; }

    public string AchievementId { get; private set; }

    public bool Unlocked { get; private set; }

    public DateTime? UnlockedAt { get; private set; }

    public DateTime Timestamp { get; private set; }
}