using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using SteamAdminPanel.Infrastructure.GeoIP;

namespace SteamAdminPanel.Api.Hubs;

public class GlobeHub : Hub
{
    public static readonly ConcurrentDictionary<string, GeoPoint> ActiveUsers = new();
    private readonly GeoLocationService _geo;

    public GlobeHub(GeoLocationService geo)
    {
        _geo = geo;
    }

    public override async Task OnConnectedAsync()
    {
        var ip = GetClientIp();
        var point = _geo.Resolve(ip);

        if (point is not null)
        {
            ActiveUsers[Context.ConnectionId] = point;
            await Clients.All.SendAsync("UsersUpdated", ActiveUsers.Values.ToList());
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? ex)
    {
        ActiveUsers.TryRemove(Context.ConnectionId, out _);
        await Clients.All.SendAsync("UsersUpdated", ActiveUsers.Values.ToList());
        await base.OnDisconnectedAsync(ex);
    }

    private string GetClientIp()
    {
        var http = Context.GetHttpContext();
        var forwarded = http?.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return forwarded?.Split(',')[0].Trim()
            ?? http?.Connection.RemoteIpAddress?.ToString()
            ?? "127.0.0.1";
    }
}
