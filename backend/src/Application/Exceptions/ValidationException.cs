namespace SteamAdminPanel.Application.Exceptions;

public sealed class ValidationException : Exception
{
    public ValidationException(IDictionary<string, string[]> errors)
        : base("Ошибка валидации.")
    {
        Errors = errors;
    }

    public ValidationException(string message)
        : base(message)
    {
        Errors = new Dictionary<string, string[]>();
    }

    public IDictionary<string, string[]> Errors { get; }
}