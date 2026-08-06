using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Time;

public sealed class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}