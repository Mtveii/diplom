using FluentValidation;
using SteamAdminPanel.Application.Contracts.Members;

namespace SteamAdminPanel.Application.Validation;

public sealed class IssueWarningRequestValidator : AbstractValidator<IssueWarningRequestDto>
{
    public IssueWarningRequestValidator()
    {
        RuleFor(x => x.MemberId)
            .GreaterThan(0);

        RuleFor(x => x.Reason)
            .NotEmpty()
            .MaximumLength(500);

        RuleFor(x => x.Severity)
            .IsInEnum();

        RuleFor(x => x.ExpiresAt)
            .GreaterThan(x => DateTime.UtcNow)
            .When(x => x.ExpiresAt.HasValue)
            .WithMessage("Дата истечения должна быть в будущем.");

        RuleFor(x => x.BanForDays)
            .GreaterThan(0)
            .LessThanOrEqualTo(3650)
            .When(x => x.BanForDays.HasValue);

        RuleFor(x => x.MuteForDays)
            .GreaterThan(0)
            .LessThanOrEqualTo(3650)
            .When(x => x.MuteForDays.HasValue);
    }
}