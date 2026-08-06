namespace SteamAdminPanel.Infrastructure.Notifications;

/// <summary>
/// JSON-конфигурация канала уведомлений (хранится в ConfigJson настройки канала).
/// </summary>
public sealed class ChannelConfig
{
    public string? WebhookUrl { get; set; }

    public string? BotToken { get; set; }

    public string? ChatId { get; set; }

    public string? Recipients { get; set; }
}