namespace SteamAdminPanel.Application.Contracts.Analytics;

public sealed record CohortRowDto(
    string CohortMonth,
    int CohortSize,
    IReadOnlyList<RetentionPointDto> Points);