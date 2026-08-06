using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Domain.Entities;

public sealed class NotificationChannelSetting
{
    private NotificationChannelSetting()
    {
    }

    public NotificationChannelSetting(NotificationChannel channel, bool isEnabled, string? configJson)
    {
        Channel = channel;
        IsEnabled = isEnabled;
        ConfigJson = configJson;
    }

    public int Id { get; private set; }

    public NotificationChannel Channel { get; private set; }

    public bool IsEnabled { get; private set; }

    /// <summary>
    /// JSON-настройки канала: webhook url, bot token, chat id, email recipients.
    /// </summary>
    public string? ConfigJson { get; private set; }

    public void Update(bool isEnabled, string? configJson)
    {
        IsEnabled = isEnabled;
        ConfigJson = configJson;
    }
}