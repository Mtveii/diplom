using SteamAdminPanel.Application.Contracts.Alerts;

namespace SteamAdminPanel.Application.Interfaces;

public interface IAlertService
{
    Task<IReadOnlyList<AlertRuleDto>> GetRulesAsync(CancellationToken cancellationToken = default);

    Task<AlertRuleDto> CreateRuleAsync(CreateAlertRuleRequestDto request, int actorUserId,
        CancellationToken cancellationToken = default);

    Task<AlertRuleDto> UpdateRuleAsync(int id, UpdateAlertRuleRequestDto request, int actorUserId,
        CancellationToken cancellationToken = default);

    Task<AlertRuleDto> ToggleRuleAsync(int id, bool isActive, CancellationToken cancellationToken = default);

    Task DeleteRuleAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AlertHistoryDto>> GetHistoryAsync(int limit = 100, bool unreadOnly = false,
        CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(CancellationToken cancellationToken = default);

    Task MarkAsReadAsync(int id, CancellationToken cancellationToken = default);

    Task MarkAllAsReadAsync(CancellationToken cancellationToken = default);

    Task<int> EvaluateAllRulesAsync(CancellationToken cancellationToken = default);
}