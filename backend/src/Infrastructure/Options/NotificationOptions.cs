namespace SteamAdminPanel.Infrastructure.Options;

public sealed class NotificationOptions
{
    public const string SectionName = "Notifications";

    public string DiscordWebhookUrl { get; set; } = string.Empty;

    public string TelegramBotToken { get; set; } = string.Empty;

    public string TelegramChatId { get; set; } = string.Empty;

    public string SmtpServer { get; set; } = string.Empty;

    public int SmtpPort { get; set; } = 587;

    public string SmtpUsername { get; set; } = string.Empty;

    public string SmtpPassword { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;

    public string FromName { get; set; } = "Steam Clan Admin Panel";

    public string WeeklyDigestRecipients { get; set; } = string.Empty;

    public string AppBaseUrl { get; set; } = "http://localhost:3000";
}