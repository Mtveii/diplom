using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>
/// Каждый час: оценка всех активных правил алертов
/// (неактивность, падение ревью, старт скидки, новые новости).
/// </summary>
public sealed class AlertEvaluationJob
{
    private readonly IAlertService _alertService;

    public AlertEvaluationJob(IAlertService alertService)
    {
        _alertService = alertService;
    }

    public async Task RunAsync()
    {
        await _alertService.EvaluateAllRulesAsync(CancellationToken.None);
    }
}