namespace SteamAdminPanel.Application.Contracts.Analytics;

public sealed record PeriodComparisonDto(
    DateTime? CurrentPeriodStart,
    DateTime? CurrentPeriodEnd,
    DateTime? PreviousPeriodStart,
    DateTime? PreviousPeriodEnd,
    int CurrentActivePlayers,
    int PreviousActivePlayers,
    double ActivePlayersChangePercent,
    long CurrentPlaytimeMinutes,
    long PreviousPlaytimeMinutes,
    double PlaytimeChangePercent,
    double CurrentAverageDailyOnline,
    double PreviousAverageDailyOnline,
    double AverageOnlineChangePercent);