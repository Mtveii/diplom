using FluentValidation;
using SteamAdminPanel.Application.Contracts.Members;

namespace SteamAdminPanel.Application.Validation;

public sealed class CreateMemberRequestValidator : AbstractValidator<CreateMemberRequestDto>
{
    public CreateMemberRequestValidator()
    {
        RuleFor(x => x.SteamId64)
            .NotEmpty()
            .Matches("^[0-9]{17}$")
            .WithMessage("SteamId64 должен состоять из 17 цифр.");
    }
}