namespace SteamAdminPanel.Application.Contracts.Monitoring;

public sealed record HeatmapPointDto(int DayOfWeek, int Hour, int ActiveCount);