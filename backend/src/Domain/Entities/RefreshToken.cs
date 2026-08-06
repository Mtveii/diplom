namespace SteamAdminPanel.Domain.Entities;

public sealed class RefreshToken
{
    private RefreshToken()
    {
    }

    public RefreshToken(int userId, string tokenHash, DateTime expiresAt)
    {
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
        RevokedAt = null;
    }

    public int Id { get; private set; }

    public int UserId { get; private set; }

    public string TokenHash { get; private set; }

    public DateTime ExpiresAt { get; private set; }

    public DateTime? RevokedAt { get; private set; }

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTime.UtcNow;

    public void Revoke(DateTime timestamp)
    {
        RevokedAt = timestamp;
    }
}