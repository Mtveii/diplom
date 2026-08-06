using FluentValidation;
using SteamAdminPanel.Application.Contracts.Analytics;

namespace SteamAdminPanel.Application.Validation;

public sealed class ExportReportRequestValidator : AbstractValidator<ExportReportRequestDto>
{
    public ExportReportRequestValidator()
    {
        RuleFor(x => x.Format)
            .IsInEnum();

        RuleFor(x => x.From)
            .LessThan(x => x.To)
            .When(x => x.From.HasValue && x.To.HasValue);

        RuleFor(x => x.To)
            .LessThan(DateTime.UtcNow.AddDays(1))
            .When(x => x.To.HasValue);
    }
}