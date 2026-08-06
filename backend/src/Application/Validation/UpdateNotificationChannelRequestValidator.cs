using FluentValidation;
using SteamAdminPanel.Application.Contracts.Notifications;

namespace SteamAdminPanel.Application.Validation;

public sealed class UpdateNotificationChannelRequestValidator : AbstractValidator<UpdateNotificationChannelRequestDto>
{
    public UpdateNotificationChannelRequestValidator()
    {
        RuleFor(x => x.ConfigJson)
            .Must(x => string.IsNullOrWhiteSpace(x) || IsValidJson(x))
            .WithMessage("ConfigJson должен быть валидным JSON.");
    }

    private static bool IsValidJson(string value)
    {
        try
        {
            System.Text.Json.JsonDocument.Parse(value);
            return true;
        }
        catch (System.Text.Json.JsonException)
        {
            return false;
        }
    }
}