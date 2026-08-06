namespace SteamAdminPanel.Infrastructure.Options;

public sealed class FreeToGameOptions
{
    public const string SectionName = "FreeToGame";

    public string BaseUrl { get; set; } = "https://www.freetogame.com";
}