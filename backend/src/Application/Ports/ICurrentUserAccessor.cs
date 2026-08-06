namespace SteamAdminPanel.Application.Ports;

public interface ICurrentUserAccessor
{
    int? UserId { get; }

    string? IpAddress { get; }
}