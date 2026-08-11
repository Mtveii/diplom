using System.Security.Cryptography;
using System.Text;

namespace SteamAdminPanel.Application.Services;

/// <summary>
/// Нормализация названий игр для связывания записей из разных источников:
/// toLowerCase, удаление пунктуации/лишних пробелов, trim.
/// </summary>
public static class GameTitleNormalizer
{
    private static readonly char[] RemovedChars = { '™', '®', ':', '-', '—', '\'', '"' };

    public static string Normalize(string title)
    {
        var builder = new StringBuilder(title.Length);
        var pendingSpace = false;
        foreach (var ch in title)
        {
            if (char.IsWhiteSpace(ch) || Array.IndexOf(RemovedChars, ch) >= 0)
            {
                pendingSpace = builder.Length > 0;
            }
            else
            {
                if (pendingSpace && builder.Length > 0)
                {
                    builder.Append(' ');
                }

                pendingSpace = false;
                builder.Append(char.ToLowerInvariant(ch));
            }
        }

        return builder.ToString().Trim();
    }

    /// <summary>Стабильный внутренний id карточки — SHA256 от нормализованного названия.</summary>
    public static string HashId(string normalizedTitle)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedTitle));
        return Convert.ToHexString(bytes)[..32].ToLowerInvariant();
    }
}
