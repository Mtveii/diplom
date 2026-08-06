using FluentValidation;
using SteamAdminPanel.Application.Contracts.Users;

namespace SteamAdminPanel.Application.Validation;

public sealed class UpdateUserRoleRequestValidator : AbstractValidator<UpdateUserRoleRequestDto>
{
    public UpdateUserRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .IsInEnum();
    }
}