using SteamAdminPanel.Application.Contracts.Alerts;
using SteamAdminPanel.Application.Contracts.Steam;
using SteamAdminPanel.Application.Exceptions;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace SteamAdminPanel.Application.Services;

public sealed class AlertService : IAlertService
{
    private static readonly TimeSpan DeduplicationWindow = TimeSpan.FromHours(24);

    private readonly IRepository<AlertRule> _rules;
    private readonly IRepository<AlertHistory> _history;
    private readonly IRepository<PlayerStatusSnapshot> _statusSnapshots;
    private readonly IRepository<GameStatsSnapshot> _gameStatsSnapshots;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISteamApiClient _steamApi;
    private readonly INotificationDispatcher _notifications;
    private readonly IDashboardHubClient _dashboardHub;
    private readonly IClock _clock;
    private readonly ILogger<AlertService> _logger;

    public AlertService(
        IRepository<AlertRule> rules,
        IRepository<AlertHistory> history,
        IRepository<PlayerStatusSnapshot> statusSnapshots,
        IRepository<GameStatsSnapshot> gameStatsSnapshots,
        IUnitOfWork unitOfWork,
        ISteamApiClient steamApi,
        INotificationDispatcher notifications,
        IDashboardHubClient dashboardHub,
        IClock clock,
        ILogger<AlertService> logger)
    {
        _rules = rules;
        _history = history;
        _statusSnapshots = statusSnapshots;
        _gameStatsSnapshots = gameStatsSnapshots;
        _unitOfWork = unitOfWork;
        _steamApi = steamApi;
        _notifications = notifications;
        _dashboardHub = dashboardHub;
        _clock = clock;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AlertRuleDto>> GetRulesAsync(CancellationToken cancellationToken)
    {
        var rules = await _rules.ListAsync(null, cancellationToken);
        return rules
            .OrderByDescending(x => x.CreatedAt)
            .Select(MapToRuleDto)
            .ToList();
    }

    public async Task<AlertRuleDto> CreateRuleAsync(CreateAlertRuleRequestDto request, int actorUserId,
        CancellationToken cancellationToken)
    {
        var rule = new AlertRule(request.Type, request.TargetId, request.Condition, request.ThresholdValue,
            request.IsActive, request.Name);
        _rules.Add(rule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToRuleDto(rule);
    }

    public async Task<AlertRuleDto> UpdateRuleAsync(int id, UpdateAlertRuleRequestDto request, int actorUserId,
        CancellationToken cancellationToken)
    {
        var rule = await GetRuleOrThrowAsync(id, cancellationToken);
        rule.Update(request.Type, request.TargetId, request.Condition, request.ThresholdValue, request.IsActive,
            request.Name);
        _rules.Update(rule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToRuleDto(rule);
    }

    public async Task<AlertRuleDto> ToggleRuleAsync(int id, bool isActive, CancellationToken cancellationToken)
    {
        var rule = await GetRuleOrThrowAsync(id, cancellationToken);
        rule.Update(rule.Type, rule.TargetId, rule.Condition, rule.ThresholdValue, isActive, rule.Name);
        _rules.Update(rule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToRuleDto(rule);
    }

    public async Task DeleteRuleAsync(int id, CancellationToken cancellationToken)
    {
        var rule = await GetRuleOrThrowAsync(id, cancellationToken);
        _rules.Remove(rule);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AlertHistoryDto>> GetHistoryAsync(int limit, bool unreadOnly,
        CancellationToken cancellationToken)
    {
        var history = await _history.ListAsync(
            unreadOnly ? x => !x.IsRead : null,
            cancellationToken);

        var ruleIds = history.Select(x => x.RuleId).Distinct().ToList();
        var rules = ruleIds.Count == 0
            ? Array.Empty<AlertRule>()
            : await _rules.ListAsync(x => ruleIds.Contains(x.Id), cancellationToken);

        return history
            .OrderByDescending(x => x.TriggeredAt)
            .Take(limit)
            .Select(h => new AlertHistoryDto(
                h.Id,
                h.RuleId,
                rules.FirstOrDefault(r => r.Id == h.RuleId)?.Name ?? $"#{h.RuleId}",
                h.TriggeredAt,
                h.Message,
                h.IsRead))
            .ToList();
    }

    public async Task<int> GetUnreadCountAsync(CancellationToken cancellationToken)
    {
        return await _history.CountAsync(x => !x.IsRead, cancellationToken);
    }

    public async Task MarkAsReadAsync(int id, CancellationToken cancellationToken)
    {
        var entry = await _history.GetByIdAsync(id, cancellationToken);
        if (entry is null)
        {
            return;
        }

        entry.MarkAsRead();
        _history.Update(entry);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkAllAsReadAsync(CancellationToken cancellationToken)
    {
        var unread = await _history.ListAsync(x => !x.IsRead, cancellationToken);
        foreach (var entry in unread)
        {
            entry.MarkAsRead();
            _history.Update(entry);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> EvaluateAllRulesAsync(CancellationToken cancellationToken)
    {
        var rules = await _rules.ListAsync(x => x.IsActive, cancellationToken);
        var recentHistory = await _history.ListAsync(x => x.TriggeredAt >= _clock.UtcNow.Subtract(DeduplicationWindow),
            cancellationToken);
        var triggeredByRule = recentHistory.Select(x => x.RuleId).ToHashSet();

        var statuses = await _statusSnapshots.ListAsync(null, cancellationToken);
        var lastOnlineByMember = statuses
            .GroupBy(x => x.SteamId64)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Timestamp).First().Timestamp);

        var gameStats = await _gameStatsSnapshots.ListAsync(null, cancellationToken);
        IReadOnlyDictionary<uint, IReadOnlyList<GameStatsSnapshot>> snapshotsByApp = gameStats
            .GroupBy(x => x.AppId)
            .ToDictionary(g => g.Key,
                g => (IReadOnlyList<GameStatsSnapshot>)g.OrderByDescending(x => x.Timestamp).ToList());

        var newsByApp = await LoadNewsForRulesAsync(rules, cancellationToken);

        var triggered = 0;
        foreach (var rule in rules)
        {
            if (triggeredByRule.Contains(rule.Id))
            {
                continue;
            }

            string? message = EvaluateRule(rule, lastOnlineByMember, snapshotsByApp, newsByApp);
            if (message is null)
            {
                continue;
            }

            var historyEntry = new AlertHistory(rule.Id, message);
            _history.Add(historyEntry);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            triggered++;

            var historyDto = new AlertHistoryDto(
                historyEntry.Id,
                rule.Id,
                rule.Name,
                historyEntry.TriggeredAt,
                message,
                false);

            await _notifications.SendAsync(
                new NotificationMessage($"Алерт: {rule.Name}", message, "warning"), cancellationToken);
            await _dashboardHub.PushAlertAsync(historyDto, cancellationToken);

            _logger.LogWarning("Алерт {RuleName} сработал: {Message}", rule.Name, message);
        }

        return triggered;
    }

    private async Task<IReadOnlyDictionary<uint, IReadOnlyList<SteamNewsItemDto>>> LoadNewsForRulesAsync(
        IReadOnlyList<AlertRule> rules, CancellationToken cancellationToken)
    {
        var appIds = rules
            .Where(r => r.Type == AlertRuleType.NewsRelease)
            .Select(r => uint.TryParse(r.TargetId, out var id) ? id : 0u)
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        var result = new Dictionary<uint, IReadOnlyList<SteamNewsItemDto>>();
        foreach (var appId in appIds)
        {
            try
            {
                result[appId] = await _steamApi.GetNewsForAppAsync(appId, 3, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Не удалось получить новости Steam для AppId {AppId}", appId);
            }
        }

        return result;
    }

    private string? EvaluateRule(
        AlertRule rule,
        IReadOnlyDictionary<string, DateTime> lastOnlineByMember,
        IReadOnlyDictionary<uint, IReadOnlyList<GameStatsSnapshot>> snapshotsByApp,
        IReadOnlyDictionary<uint, IReadOnlyList<SteamNewsItemDto>> newsByApp)
    {
        switch (rule.Type)
        {
            case AlertRuleType.NoLoginFor:
                return EvaluateNoLoginRule(rule, lastOnlineByMember);
            case AlertRuleType.ReviewDrop:
                return EvaluateReviewDropRule(rule, snapshotsByApp);
            case AlertRuleType.DiscountStarted:
                return EvaluateDiscountStartedRule(rule, snapshotsByApp);
            case AlertRuleType.NewsRelease:
                return EvaluateNewsReleaseRule(rule, newsByApp);
            default:
                return null;
        }
    }

    private string? EvaluateNoLoginRule(AlertRule rule,
        IReadOnlyDictionary<string, DateTime> lastOnlineByMember)
    {
        if (rule.TargetId is null || !lastOnlineByMember.TryGetValue(rule.TargetId, out var lastOnline))
        {
            return null;
        }

        var daysWithoutLogin = (int)(_clock.UtcNow - lastOnline).TotalDays;
        return SafelyCompare(rule.Condition, daysWithoutLogin, (double)rule.ThresholdValue)
            ? $"Участник {rule.TargetId} не заходил {daysWithoutLogin} дней (порог {rule.ThresholdValue})."
            : null;
    }

    private string? EvaluateReviewDropRule(AlertRule rule,
        IReadOnlyDictionary<uint, IReadOnlyList<GameStatsSnapshot>> snapshotsByApp)
    {
        if (rule.TargetId is null || !uint.TryParse(rule.TargetId, out var appId) ||
            !snapshotsByApp.TryGetValue(appId, out var snapshots))
        {
            return null;
        }

        var latest = snapshots[0];
        var previous = snapshots.FirstOrDefault(x => x.Timestamp < latest.Timestamp);
        if (latest.PositiveReviewPercent is null || previous?.PositiveReviewPercent is null)
        {
            return null;
        }

        var drop = previous.PositiveReviewPercent.Value - latest.PositiveReviewPercent.Value;
        return SafelyCompare(rule.Condition, (double)drop, (double)rule.ThresholdValue)
            ? $"Резкое падение % положительных ревью у игры App {appId}: -{drop:F1}% за период."
            : null;
    }

    private string? EvaluateDiscountStartedRule(AlertRule rule,
        IReadOnlyDictionary<uint, IReadOnlyList<GameStatsSnapshot>> snapshotsByApp)
    {
        if (rule.TargetId is null || !uint.TryParse(rule.TargetId, out var appId) ||
            !snapshotsByApp.TryGetValue(appId, out var snapshots))
        {
            return null;
        }

        var latest = snapshots[0];
        var previous = snapshots.FirstOrDefault(x => x.Timestamp < latest.Timestamp);
        if (latest.DiscountPercent is null || latest.DiscountPercent == 0)
        {
            return null;
        }

        if (previous?.DiscountPercent is null || previous.DiscountPercent == 0)
        {
            return $"Началась скидка на игру App {appId}: -{latest.DiscountPercent}%.";
        }

        return SafelyCompare(rule.Condition, (double)latest.DiscountPercent.Value,
            (double)rule.ThresholdValue)
            ? $"Скидка на игру App {appId} выросла до {latest.DiscountPercent}%."
            : null;
    }

    private string? EvaluateNewsReleaseRule(AlertRule rule,
        IReadOnlyDictionary<uint, IReadOnlyList<SteamNewsItemDto>> newsByApp)
    {
        if (rule.TargetId is null || !uint.TryParse(rule.TargetId, out var appId) ||
            !newsByApp.TryGetValue(appId, out var news))
        {
            return null;
        }

        var recentNews = news
            .Where(x => x.Date.HasValue && x.Date.Value >= _clock.UtcNow.AddHours(-48))
            .ToList();

        if (recentNews.Count == 0)
        {
            return null;
        }

        var item = recentNews[0];
        return $"Новая новость по игре App {appId}: {item.Title}.";
    }

    private static bool SafelyCompare(AlertCondition condition, double value, double threshold)
    {
        return condition switch
        {
            AlertCondition.LessThan => value < threshold,
            AlertCondition.GreaterThan => value > threshold,
            AlertCondition.Equals => Math.Abs(value - threshold) < 0.0001,
            _ => false
        };
    }

    private async Task<AlertRule> GetRuleOrThrowAsync(int id, CancellationToken cancellationToken)
    {
        return await _rules.GetByIdAsync(id, cancellationToken)
               ?? throw new NotFoundException($"Правило алерта {id} не найдено.");
    }

    private static AlertRuleDto MapToRuleDto(AlertRule rule)
    {
        return new AlertRuleDto(
            rule.Id,
            rule.Name,
            rule.Type,
            rule.TargetId,
            rule.Condition,
            rule.ThresholdValue,
            rule.IsActive,
            rule.CreatedAt);
    }
}