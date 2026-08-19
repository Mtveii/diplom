using System;
using System.IO;
using MaxMind.GeoIP2;
using MaxMind.GeoIP2.Exceptions;
using Microsoft.Extensions.Configuration;

namespace SteamAdminPanel.Infrastructure.GeoIP;

public record GeoPoint(double Lat, double Lng, string City, string Country);

public class GeoLocationService : IDisposable
{
    private readonly DatabaseReader? _reader;
    private static readonly (double Lat, double Lng, string City, string Country)[] FallbackLocations = new[]
    {
        (55.7558, 37.6173, "Moscow", "RU"),
        (46.4825, 30.7233, "Odesa", "UA"),
        (35.6762, 139.6503, "Tokyo", "JP"),
        (40.7128, -74.0060, "New York", "US"),
        (51.5074, -0.1278, "London", "GB"),
        (39.9042, 116.4074, "Beijing", "CN"),
        (-33.8688, 151.2093, "Sydney", "AU"),
        (48.8566, 2.3522, "Paris", "FR")
    };

    public GeoLocationService(IConfiguration config)
    {
        var path = config["GeoIp:DbPath"] ?? "/opt/geoip/GeoLite2-City.mmdb";
        try
        {
            if (File.Exists(path))
            {
                _reader = new DatabaseReader(path);
            }
        }
        catch
        {
            _reader = null;
        }
    }

    public GeoPoint Resolve(string ip)
    {
        if (IsPrivateIp(ip) || _reader == null)
        {
            // Deterministic pseudo-random fallback based on IP string hash
            int hash = Math.Abs(ip.GetHashCode());
            var loc = FallbackLocations[hash % FallbackLocations.Length];
            return new GeoPoint(loc.Lat, loc.Lng, loc.City, loc.Country);
        }

        try
        {
            var city = _reader.City(ip);
            return new GeoPoint(
                city.Location.Latitude ?? 55.7558,
                city.Location.Longitude ?? 37.6173,
                city.City.Name ?? "Unknown",
                city.Country.IsoCode ?? "RU");
        }
        catch (AddressNotFoundException)
        {
            var loc = FallbackLocations[Math.Abs(ip.GetHashCode()) % FallbackLocations.Length];
            return new GeoPoint(loc.Lat, loc.Lng, loc.City, loc.Country);
        }
    }

    private static bool IsPrivateIp(string ip) =>
        string.IsNullOrEmpty(ip) || ip.StartsWith("192.168.") || ip.StartsWith("10.") || ip.StartsWith("172.") || ip == "::1" || ip == "127.0.0.1" || ip == "0.0.0.0";

    public void Dispose()
    {
        _reader?.Dispose();
    }
}
