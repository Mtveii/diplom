using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Infrastructure.Notifications;

public sealed class TelegramSender : INotificationSender
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TelegramSender> _logger;

    public TelegramSender(HttpClient httpClient, ILogger<TelegramSender> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public NotificationChannel Channel => NotificationChannel.Telegram;

    public async Task SendAsync(NotificationMessage message, string? configJson,
        CancellationToken cancellationToken)
    {
        var config = JsonSerializer.Deserialize<ChannelConfig>(configJson ?? "{}");
        if (string.IsNullOrWhiteSpace(config?.BotToken) || string.IsNullOrWhiteSpace(config.ChatId))
        {
            _logger.LogWarning("Telegram бот не настроен.");
            return;
        }

        var url = $"https://api.telegram.org/bot{config.BotToken}/sendMessage";
        var payload = new TelegramPayload
        {
            ChatId = config.ChatId,
            Text = $"**{message.Title}**\n{message.Body}",
            ParseMode = "Markdown"
        };

        using var response = await _httpClient.PostAsJsonAsync(url, payload, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Telegram вернул {StatusCode}", response.StatusCode);
        }
    }

    private sealed class TelegramPayload
    {
        [JsonPropertyName("chat_id")]
        public string ChatId { get; set; } = string.Empty;

        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;

        [JsonPropertyName("parse_mode")]
        public string ParseMode { get; set; } = "Markdown";
    }
}