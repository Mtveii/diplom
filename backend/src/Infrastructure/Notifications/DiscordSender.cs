using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Infrastructure.Notifications;

public sealed class DiscordSender : INotificationSender
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DiscordSender> _logger;

    public DiscordSender(HttpClient httpClient, ILogger<DiscordSender> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public NotificationChannel Channel => NotificationChannel.Discord;

    public async Task SendAsync(NotificationMessage message, string? configJson,
        CancellationToken cancellationToken)
    {
        var config = JsonSerializer.Deserialize<ChannelConfig>(configJson ?? "{}");
        if (string.IsNullOrWhiteSpace(config?.WebhookUrl))
        {
            _logger.LogWarning("Discord webhook не настроен.");
            return;
        }

        var payload = new DiscordPayload
        {
            Content = $"**{message.Title}**\n{message.Body}"
        };

        using var response = await _httpClient.PostAsJsonAsync(config.WebhookUrl, payload, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Discord webhook вернул {StatusCode}", response.StatusCode);
        }
    }

    private sealed class DiscordPayload
    {
        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }
}