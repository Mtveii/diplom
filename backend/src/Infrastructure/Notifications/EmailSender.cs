using System.Net;
using System.Net.Mail;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Enums;
using SteamAdminPanel.Infrastructure.Options;

namespace SteamAdminPanel.Infrastructure.Notifications;

public sealed class EmailSender : INotificationSender
{
    private readonly NotificationOptions _options;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(IOptions<NotificationOptions> options, ILogger<EmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public NotificationChannel Channel => NotificationChannel.Email;

    public async Task SendAsync(NotificationMessage message, string? configJson,
        CancellationToken cancellationToken)
    {
        var config = JsonSerializer.Deserialize<ChannelConfig>(configJson ?? "{}");
        var recipients = (config?.Recipients ?? _options.WeeklyDigestRecipients)
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (recipients.Length == 0 || string.IsNullOrWhiteSpace(_options.SmtpServer))
        {
            _logger.LogWarning("Email не настроен: нет SMTP или получателей.");
            return;
        }

        using var smtp = new SmtpClient(_options.SmtpServer, _options.SmtpPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(_options.SmtpUsername, _options.SmtpPassword)
        };

        using var mail = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = message.Title,
            Body = message.Body,
            IsBodyHtml = false
        };

        foreach (var recipient in recipients)
        {
            mail.To.Add(recipient);
        }

        await smtp.SendMailAsync(mail, cancellationToken);
        _logger.LogInformation("Email отправлен {Count} получателям", recipients.Length);
    }
}