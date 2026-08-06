using SteamAdminPanel.Application.Contracts.Members;
using SteamAdminPanel.Application.Contracts.Steam;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Interfaces;

public interface IClanMemberService
{
    Task<IReadOnlyList<ClanMemberDto>> GetAllAsync(string? search, MemberStatus? status, InternalRank? rank,
        CancellationToken cancellationToken = default);

    Task<ClanMemberDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<ClanMemberDto> CreateAsync(CreateMemberRequestDto request, int actorUserId, string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<ClanMemberDto> UpdateRankAsync(int id, UpdateMemberRankRequestDto request, int actorUserId,
        CancellationToken cancellationToken = default);

    Task<ClanMemberDto> SetStatusAsync(int id, SetMemberStatusRequestDto request, int actorUserId,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken = default);

    Task<int> ImportBySteamGroupAsync(string groupId, int actorUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MemberWarningDto>> GetWarningsAsync(int memberId,
        CancellationToken cancellationToken = default);

    Task<MemberWarningDto> IssueWarningAsync(IssueWarningRequestDto request, int actorUserId,
        CancellationToken cancellationToken = default);

    Task DeactivateWarningAsync(int warningId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MemberProfileHistoryDto>> GetProfileHistoryAsync(int memberId, int limit = 50,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Деактивирует истёкшие варнинги и снимает бан/мут с членов клана.
    /// Вызывается фоновой джобой. Возвращает количество обработанных предупреждений.
    /// </summary>
    Task<int> ExpireOverdueWarningsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Обновляет ник/аватар участников из Steam и пишет историю изменений профиля.
    /// Вызывается из фоновой джобы сбора данных.
    /// </summary>
    Task TrackProfileChangesAsync(IReadOnlyList<SteamPlayerSummaryDto> summaries,
        CancellationToken cancellationToken = default);
}