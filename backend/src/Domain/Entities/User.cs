using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Domain.Entities;

public sealed class User
{
    private User()
    {
    }

    public User(string steamId64, string username, string avatarUrl, UserRole role)
    {
        SteamId64 = steamId64;
        Username = username;
        AvatarUrl = avatarUrl;
        Role = role;
        CreatedAt = DateTime.UtcNow;
    }

    public int Id { get; private set; }

    public string SteamId64 { get; private set; }

    public string Username { get; private set; }

    public string AvatarUrl { get; private set; }

    public void UpdateIdentity(string username, string avatarUrl)
    {
        Username = username;
        AvatarUrl = avatarUrl;
    }

    public UserRole Role { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? LastLoginAt { get; private set; }

    /// <summary>Логин для резервного входа админа (null, если вход только через Steam).</summary>
    public string? AdminUsername { get; private set; }

    public string? PasswordHash { get; private set; }

    public bool IsAdminAccount => AdminUsername is not null;

    public void SetRole(UserRole role)
    {
        Role = role;
    }

    public void SetAdminCredentials(string adminUsername, string passwordHash)
    {
        AdminUsername = adminUsername;
        PasswordHash = passwordHash;
    }

    public void SetLastLogin(DateTime timestamp)
    {
        LastLoginAt = timestamp;
    }
}