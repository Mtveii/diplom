using SteamAdminPanel.Application.Contracts.Notifications;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Services;

public sealed class NotificationService : INotificationService
{
    private readonly IRepository<NotificationChannelSetting> _settings;
    private readonly IUnitOfWork _unitOfWork;
    private readonly INotificationDispatcher _dispatcher;

    public NotificationService(
        IRepository<NotificationChannelSetting> settings,
        IUnitOfWork unitOfWork,
        INotificationDispatcher dispatcher)
    {
        _settings = settings;
        _unitOfWork = unitOfWork;
        _dispatcher = dispatcher;
    }

    public async Task<IReadOnlyList<NotificationChannelSettingDto>> GetChannelSettingsAsync(
        CancellationToken cancellationToken)
    {
        var settings = await _settings.ListAsync(null, cancellationToken);
        var channels = Enum.GetValues<NotificationChannel>();

        var byChannel = settings.ToDictionary(x => x.Channel);

        // Гарантируем наличие настройки для каждого канала (seed по запросу).
        var missingChannels = channels.Where(c => !byChannel.ContainsKey(c)).ToList();
        foreach (var channel in missingChannels)
        {
            var setting = new NotificationChannelSetting(channel, false, null);
            _settings.Add(setting);
            byChannel[channel] = setting;
        }

        if (missingChannels.Count > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return channels
            .Select(c => new NotificationChannelSettingDto(c, byChannel[c].IsEnabled, byChannel[c].ConfigJson))
            .ToList();
    }

    public async Task<NotificationChannelSettingDto> UpdateChannelSettingAsync(NotificationChannel channel,
        UpdateNotificationChannelRequestDto request, CancellationToken cancellationToken)
    {
        var setting = await _settings.FirstOrDefaultAsync(x => x.Channel == channel, cancellationToken)
                      ?? new NotificationChannelSetting(channel, request.IsEnabled, request.ConfigJson);
        if (setting.Id == 0)
        {
            _settings.Add(setting);
        }
        else
        {
            setting.Update(request.IsEnabled, request.ConfigJson);
            _settings.Update(setting);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new NotificationChannelSettingDto(setting.Channel, setting.IsEnabled, setting.ConfigJson);
    }

    public async Task SendTestAsync(NotificationChannel channel, CancellationToken cancellationToken)
    {
        await _dispatcher.SendAsync(
            new NotificationMessage("Тестовое уведомление", "Канал работает корректно.", "info"),
            cancellationToken);
    }
}