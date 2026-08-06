using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Api;
using SteamAdminPanel.Application.Contracts.Notifications;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public sealed class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    /// <summary>Настройки каналов уведомлений.</summary>
    [HttpGet("channels")]
    [Authorize(Policy = PolicyNames.AdminOnly)]
    public async Task<ActionResult<IReadOnlyList<NotificationChannelSettingDto>>> GetChannels()
    {
        return Ok(await _notificationService.GetChannelSettingsAsync(HttpContext.RequestAborted));
    }

    [HttpPut("channels/{channel}")]
    [Authorize(Policy = PolicyNames.AdminOnly)]
    public async Task<ActionResult<NotificationChannelSettingDto>> UpdateChannel(NotificationChannel channel,
        [FromBody] UpdateNotificationChannelRequestDto request)
    {
        return Ok(await _notificationService.UpdateChannelSettingAsync(channel, request,
            HttpContext.RequestAborted));
    }

    /// <summary>Отправить тестовое сообщение в канал.</summary>
    [HttpPost("test/{channel}")]
    [Authorize(Policy = PolicyNames.AdminOnly)]
    public async Task<IActionResult> SendTest(NotificationChannel channel)
    {
        await _notificationService.SendTestAsync(channel, HttpContext.RequestAborted);
        return NoContent();
    }
}