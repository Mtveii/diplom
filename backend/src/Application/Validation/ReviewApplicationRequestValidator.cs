using FluentValidation;
using SteamAdminPanel.Application.Contracts.Members;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Validation;

public sealed class ReviewApplicationRequestValidator : AbstractValidator<ReviewApplicationRequestDto>
{
    public ReviewApplicationRequestValidator()
    {
        RuleFor(x => x.Decision)
            .Must(x => x == MembershipApplicationStatus.Approved || x == MembershipApplicationStatus.Rejected)
            .WithMessage("Решение должно быть Approved или Rejected.");

        RuleFor(x => x.Comment)
            .MaximumLength(1000)
            .When(x => x.Comment is not null);
    }
}