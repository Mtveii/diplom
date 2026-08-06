using Microsoft.Extensions.Logging;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Infrastructure.Notifications;

/// <summary>
/// Отправляет сообщение во все включённые каналы уведомлений.
/// Канал InApp активен всегда (in-app пуши не требуют настройки).
/// </summary>
public sealed class NotificationDispatcher : INotificationDispatcher
{
    private readonly IRepository<NotificationChannelSetting> _settings;
    private readonly IReadOnlyDictionary<NotificationChannel, INotificationSender> _senders;
    private readonly ILogger<NotificationDispatcher> _logger;

    public NotificationDispatcher(
        IRepository<NotificationChannelSetting> settings,
        IEnumerable<INotificationSender> senders,
        ILogger<NotificationDispatcher> logger)
    {
        _settings = settings;
        _senders = senders.ToDictionary(x => x.Channel);
        _logger = logger;
    }

    public async Task SendAsync(NotificationMessage message, CancellationToken cancellationToken)
    {
        var allSettings = await _settings.ListAsync(null, cancellationToken);
        var enabled = allSettings.Where(x => x.IsEnabled || x.Channel == NotificationChannel.InApp).ToList();

        if (enabled.Count == 0)
        {
            _logger.LogInformation("Уведомление '{Title}' не отправлено: все каналы отключены.", message.Title);
            return;
        }

        foreach (var setting in enabled)
        {
            if (!_senders.TryGetValue(setting.Channel, out var sender))
            {
                _logger.LogWarning("Сендер для канала {Channel} не зарегистрирован", setting.Channel);
                continue;
            }

            try
            {
                await sender.SendAsync(message, setting.ConfigJson, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка отправки уведомления в канал {Channel}", setting.Channel);
            }
        }
    }
}