using System.Collections.Specialized;
using System.Net;
using System.Web;
using Microsoft.Extensions.Options;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Infrastructure.Options;

namespace SteamAdminPanel.Infrastructure.Steam;

/// <summary>
/// Реализация Steam OpenID (https://steamcommunity.com/openid/login).
/// Steam выступает identity provider'ом: получаем SteamId64 без своего пароля.
/// </summary>
public sealed class SteamOpenIdClient : ISteamOpenIdClient
{
    private const string OpenIdNs = "http://specs.openid.net/auth/2.0";
    private const string IdentifierSelect = "http://specs.openid.net/auth/2.0/identifier_select";
    private const string LoginEndpoint = "https://steamcommunity.com/openid/login";

    private readonly HttpClient _httpClient;
    private readonly SteamOptions _options;

    public SteamOpenIdClient(HttpClient httpClient, IOptions<SteamOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public string BuildLoginUrl(string returnUrl)
    {
        var query = string.Join("&",
            $"openid.ns={Uri.EscapeDataString(OpenIdNs)}",
            $"openid.mode=checkid_setup",
            $"openid.return_to={Uri.EscapeDataString(returnUrl)}",
            $"openid.realm={Uri.EscapeDataString(_options.OpenIdRealm)}",
            $"openid.identity={Uri.EscapeDataString(IdentifierSelect)}",
            $"openid.claimed_id={Uri.EscapeDataString(IdentifierSelect)}");

        return $"{LoginEndpoint}?{query}";
    }

    public async Task<string?> ValidateCallbackAndGetSteamIdAsync(
        IReadOnlyDictionary<string, string> query,
        CancellationToken cancellationToken)
    {
        if (!query.TryGetValue("openid.mode", out var mode) || mode != "id_res")
        {
            return null;
        }

        if (!query.TryGetValue("openid.claimed_id", out var claimedId) ||
            !Uri.TryCreate(claimedId, UriKind.Absolute, out var claimedUri))
        {
            return null;
        }

        // Проверяем подпись через Steam: mode=check_authentication с параметрами callback.
        var form = new NameValueCollection();

        // Steam OpenID требует параметры строго в том виде, как в callback.
        var paramNames = new[]
        {
            "openid.assoc_handle", "openid.signed", "openid.sig", "openid.ns", "openid.mode",
            "openid.op_endpoint", "openid.claimed_id", "openid.identity", "openid.return_to",
            "openid.response_nonce"
        };

        var hasSignature = false;
        foreach (var name in paramNames)
        {
            if (query.TryGetValue(name, out var value))
            {
                form.Add(name, value);
                hasSignature |= name is "openid.sig";
            }
        }

        if (!hasSignature)
        {
            return null;
        }

        form.Set("openid.mode", "check_authentication");

        try
        {
            var content = new FormUrlEncodedContent(ToKeyValue(form));
            var response = await _httpClient.PostAsync(LoginEndpoint, content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!body.Contains("is_valid:true", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }
        }
        catch (Exception)
        {
            // При недоступности Steam не пускаем в систему — безопаснее отказать.
            return null;
        }

        return ExtractSteamIdFromClaimedId(claimedUri);
    }

    private static string? ExtractSteamIdFromClaimedId(Uri claimedUri)
    {
        var segments = claimedUri.AbsolutePath.Trim('/').Split('/');
        var lastSegment = segments.LastOrDefault();
        return lastSegment is { Length: 17 } && lastSegment.All(char.IsDigit) ? lastSegment : null;
    }

    private static IEnumerable<KeyValuePair<string, string>> ToKeyValue(NameValueCollection collection)
    {
        foreach (var key in collection.AllKeys)
        {
            if (key is not null)
            {
                yield return new KeyValuePair<string, string>(key, collection[key] ?? string.Empty);
            }
        }
    }
}