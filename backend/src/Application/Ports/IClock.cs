namespace SteamAdminPanel.Application.Ports;

public interface IClock
{
    DateTime UtcNow { get; }
}