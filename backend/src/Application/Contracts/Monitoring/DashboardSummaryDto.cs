namespace SteamAdminPanel.Application.Contracts.Monitoring;

public sealed record DashboardSummaryDto(
    int TotalMembers,
    int OnlineNow,
    int PlayersToday,
    int ActiveThisWeek,
    int PendingApplications,
    int ActiveAlerts);