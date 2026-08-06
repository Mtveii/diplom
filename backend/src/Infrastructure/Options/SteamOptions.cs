namespace SteamAdminPanel.Infrastructure.Options;

public sealed class SteamOptions
{
    public const string SectionName = "Steam";

    public string ApiKey { get; set; } = string.Empty;

    public string WebApiBaseUrl { get; set; } = "https://api.steampowered.com";

    public string StoreBaseUrl { get; set; } = "https://store.steampowered.com";

    public string SteamSpyBaseUrl { get; set; } = "https://steamspy.com/api.php";

    public string OpenIdRealm { get; set; } = string.Empty;
}