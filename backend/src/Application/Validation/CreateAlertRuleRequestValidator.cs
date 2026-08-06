using FluentValidation;
using SteamAdminPanel.Application.Contracts.Alerts;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Validation;

public sealed class CreateAlertRuleRequestValidator : AbstractValidator<CreateAlertRuleRequestDto>
{
    public CreateAlertRuleRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Type)
            .IsInEnum();

        RuleFor(x => x.Condition)
            .IsInEnum();

        RuleFor(x => x.ThresholdValue)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.TargetId)
            .NotEmpty()
            .When(x => x.Type == AlertRuleType.NoLoginFor)
            .WithMessage("Для правила NoLoginFor требуется TargetId (SteamId64 участника).");

        RuleFor(x => x.TargetId)
            .NotEmpty()
            .When(x => x.Type == AlertRuleType.ReviewDrop || x.Type == AlertRuleType.DiscountStarted)
            .WithMessage("Для правил по игре требуется TargetId (AppId).");
    }
}