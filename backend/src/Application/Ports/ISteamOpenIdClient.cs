using SteamAdminPanel.Application.Contracts.Steam;

namespace SteamAdminPanel.Application.Ports;

public interface ISteamOpenIdClient
{
    string BuildLoginUrl(string returnUrl);

    /// <summary>
    /// Проверяет и извлекает SteamId64 из callback-запроса Steam OpenID.
    /// Возвращает null, если валидация не пройдена.
    /// </summary>
    Task<string?> ValidateCallbackAndGetSteamIdAsync(IReadOnlyDictionary<string, string> query,
        CancellationToken cancellationToken = default);
}