using SteamAdminPanel.Application.Contracts.Catalog;

namespace SteamAdminPanel.Application.Ports;

/// <summary>HTTP-клиент к каталогу GOG (ajax/filtered, пагинация по страницам).</summary>
public interface IGogClient
{
    /// <summary>�?�?�?�� �?�'�?���?��Ő� ����'���>�?�?�� GOG (40 ��?�?).</summary>
    Task<GogPageDto> GetPageAsync(int page, CancellationToken cancellationToken = default);

    /// <summary>�?�?�?�� ������?�?�? �? �?�'�?���?��Ő� GOG (описание, системные требования).</summary>
    Task<GogGameDetailsDto?> GetGameDetailsAsync(string gameUrl, CancellationToken cancellationToken = default);
}
