using System.Security.Claims;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Api;

public sealed class CurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUserAccessor(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    public int? UserId
    {
        get
        {
            var value = _accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public string? IpAddress => _accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
}