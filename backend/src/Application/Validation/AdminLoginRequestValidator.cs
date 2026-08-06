using FluentValidation;
using SteamAdminPanel.Application.Contracts.Auth;

namespace SteamAdminPanel.Application.Validation;

public sealed class AdminLoginRequestValidator : AbstractValidator<AdminLoginRequestDto>
{
    public AdminLoginRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty()
            .MaximumLength(64);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(5)
            .MaximumLength(128);
    }
}