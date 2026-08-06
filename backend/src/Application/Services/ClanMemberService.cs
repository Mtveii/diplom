using FluentValidation;
using SteamAdminPanel.Application.Contracts.Members;
using SteamAdminPanel.Application.Exceptions;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Services;

public sealed class ClanMemberService : IClanMemberService
{
    private static readonly string[] TrackedProfileFields = ["Nickname", "Avatar"];

    private readonly IRepository<ClanMember> _members;
    private readonly IRepository<User> _users;
    private readonly IRepository<MemberWarning> _warnings;
    private readonly IRepository<MemberProfileHistory> _profileHistory;
    private readonly IRepository<PlayerStatusSnapshot> _statusSnapshots;
    private readonly IRepository<PlaytimeSnapshot> _playtimeSnapshots;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISteamApiClient _steamApi;
    private readonly IClock _clock;
    private readonly IAuditService _auditService;
    private readonly IValidator<CreateMemberRequestDto> _createMemberValidator;
    private readonly IValidator<IssueWarningRequestDto> _issueWarningValidator;

    public ClanMemberService(
        IRepository<ClanMember> members,
        IRepository<User> users,
        IRepository<MemberWarning> warnings,
        IRepository<MemberProfileHistory> profileHistory,
        IRepository<PlayerStatusSnapshot> statusSnapshots,
        IRepository<PlaytimeSnapshot> playtimeSnapshots,
        IUnitOfWork unitOfWork,
        ISteamApiClient steamApi,
        IClock clock,
        IAuditService auditService,
        IValidator<CreateMemberRequestDto> createMemberValidator,
        IValidator<IssueWarningRequestDto> issueWarningValidator)
    {
        _members = members;
        _users = users;
        _warnings = warnings;
        _profileHistory = profileHistory;
        _statusSnapshots = statusSnapshots;
        _playtimeSnapshots = playtimeSnapshots;
        _unitOfWork = unitOfWork;
        _steamApi = steamApi;
        _clock = clock;
        _auditService = auditService;
        _createMemberValidator = createMemberValidator;
        _issueWarningValidator = issueWarningValidator;
    }

    public async Task<IReadOnlyList<ClanMemberDto>> GetAllAsync(string? search, MemberStatus? status,
        InternalRank? rank, CancellationToken cancellationToken)
    {
        var statusValue = status;
        var rankValue = rank;
        var members = await _members.ListAsync(x =>
            (!statusValue.HasValue || x.Status == statusValue) &&
            (!rankValue.HasValue || x.InternalRank == rankValue), cancellationToken);

        var steamIds = members.Select(x => x.SteamId64).ToList();
        var users = steamIds.Count == 0
            ? Array.Empty<User>()
            : await _users.ListAsync(x => steamIds.Contains(x.SteamId64), cancellationToken);

        var statuses = await _statusSnapshots.ListAsync(null, cancellationToken);
        var playtimes = await _playtimeSnapshots.ListAsync(null, cancellationToken);

        var lastStatusByMember = statuses
            .GroupBy(x => x.SteamId64)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Timestamp).First());
        var totalPlaytimeByMember = playtimes
            .GroupBy(x => x.SteamId64)
            .ToDictionary(g => g.Key, g => g.Max(x => x.MinutesTotal));

        IEnumerable<ClanMember> result = members;
        if (!string.IsNullOrWhiteSpace(search))
        {
            result = result.Where(member =>
            {
                var user = users.FirstOrDefault(u => u.SteamId64 == member.SteamId64);
                return user is not null &&
                       (user.Username.Contains(search, StringComparison.OrdinalIgnoreCase)
                        || member.SteamId64.Contains(search));
            });
        }

        return result
            .OrderByDescending(x => x.InternalRank)
            .ThenBy(x => x.JoinedAt)
            .Select(member => MapToDto(
                member,
                users.FirstOrDefault(u => u.SteamId64 == member.SteamId64),
                lastStatusByMember.GetValueOrDefault(member.SteamId64),
                totalPlaytimeByMember.GetValueOrDefault(member.SteamId64)))
            .ToList();
    }

    public async Task<ClanMemberDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var member = await GetMemberOrThrowAsync(id, cancellationToken);
        var user = await _users.FirstOrDefaultAsync(x => x.SteamId64 == member.SteamId64, cancellationToken);
        var lastStatus = (await _statusSnapshots.ListAsync(x => x.SteamId64 == member.SteamId64, cancellationToken))
            .OrderByDescending(x => x.Timestamp)
            .FirstOrDefault();
        var playtime = (await _playtimeSnapshots.ListAsync(x => x.SteamId64 == member.SteamId64, cancellationToken))
            .Select(x => x.MinutesTotal)
            .DefaultIfEmpty(0)
            .Max();

        return MapToDto(member, user, lastStatus, playtime);
    }

    public async Task<ClanMemberDto> CreateAsync(CreateMemberRequestDto request, int actorUserId, string? ipAddress,
        CancellationToken cancellationToken)
    {
        var validationResult = await _createMemberValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new Exceptions.ValidationException(validationResult.ToDictionary());
        }

        var exists = await _members.AnyAsync(x => x.SteamId64 == request.SteamId64, cancellationToken);
        if (exists)
        {
            throw new ConflictException("Участник с таким SteamId64 уже добавлен в клан.");
        }

        var member = new ClanMember(request.SteamId64, request.InternalRank);
        _members.Add(member);

        var user = await _users.FirstOrDefaultAsync(x => x.SteamId64 == request.SteamId64, cancellationToken);
        if (user is null)
        {
            user = new User(request.SteamId64, $"Player_{request.SteamId64[^4..]}", string.Empty, UserRole.Viewer);
            _users.Add(user);
        }

        // Обогащаем профиль данными Steam (ник/аватар), если профиль видим.
        try
        {
            var summaries = await _steamApi.GetPlayerSummariesAsync([request.SteamId64], cancellationToken);
            var summary = summaries.FirstOrDefault();
            if (summary is not null)
            {
                if (!string.IsNullOrWhiteSpace(summary.Nickname))
                {
                    user.UpdateIdentity(summary.Nickname, summary.AvatarUrl ?? string.Empty);
                    _users.Update(user);
                }
            }
        }
        catch (Exception)
        {
            // Steam недоступен — создаём участника с базовым профилем.
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(actorUserId, AuditAction.Create, AuditEntityType.ClanMember,
            member.Id.ToString(), newValue: $"{request.SteamId64} ({request.InternalRank})", ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        return MapToDto(member, user, null, 0);
    }

    public async Task<ClanMemberDto> UpdateRankAsync(int id, UpdateMemberRankRequestDto request, int actorUserId,
        CancellationToken cancellationToken)
    {
        var member = await GetMemberOrThrowAsync(id, cancellationToken);
        var oldRank = member.InternalRank;
        member.SetRank(request.InternalRank);
        _members.Update(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(actorUserId, AuditAction.Update, AuditEntityType.ClanMember, id.ToString(),
            oldRank.ToString(), request.InternalRank.ToString(), cancellationToken: cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<ClanMemberDto> SetStatusAsync(int id, SetMemberStatusRequestDto request, int actorUserId,
        CancellationToken cancellationToken)
    {
        var member = await GetMemberOrThrowAsync(id, cancellationToken);
        var oldStatus = member.Status;
        member.SetStatus(request.Status);
        _members.Update(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(actorUserId, AuditAction.StatusChange, AuditEntityType.ClanMember, id.ToString(),
            oldStatus.ToString(), request.Status.ToString(), cancellationToken: cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, int actorUserId, CancellationToken cancellationToken)
    {
        var member = await GetMemberOrThrowAsync(id, cancellationToken);
        _members.Remove(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(actorUserId, AuditAction.Delete, AuditEntityType.ClanMember, id.ToString(),
            cancellationToken: cancellationToken);
    }

    public async Task<int> ImportBySteamGroupAsync(string groupId, int actorUserId,
        CancellationToken cancellationToken)
    {
        var steamIds = await _steamApi.GetSteamGroupMemberIdsAsync(groupId, cancellationToken);

        var existing = await _members.ListAsync(null, cancellationToken);
        var existingSet = existing.Select(x => x.SteamId64).ToHashSet();

        var added = 0;
        foreach (var steamId in steamIds)
        {
            if (existingSet.Add(steamId))
            {
                _members.Add(new ClanMember(steamId, InternalRank.Recruit));
                added++;
            }
        }

        if (added > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        await _auditService.LogAsync(actorUserId, AuditAction.Create, AuditEntityType.ClanMember,
            newValue: $"Импорт из группы {groupId}: +{added}", cancellationToken: cancellationToken);

        return added;
    }

    public async Task<IReadOnlyList<MemberWarningDto>> GetWarningsAsync(int memberId,
        CancellationToken cancellationToken)
    {
        var warnings = await _warnings.ListAsync(x => x.MemberId == memberId, cancellationToken);
        var issuerIds = warnings.Where(x => x.IssuedByUserId.HasValue).Select(x => x.IssuedByUserId!.Value).Distinct()
            .ToList();
        var issuers = issuerIds.Count == 0
            ? Array.Empty<User>()
            : await _users.ListAsync(x => issuerIds.Contains(x.Id), cancellationToken);

        return warnings
            .OrderByDescending(x => x.IssuedAt)
            .Select(w => new MemberWarningDto(
                w.Id,
                w.MemberId,
                w.IssuedByUserId,
                w.IssuedByUserId.HasValue
                    ? issuers.FirstOrDefault(u => u.Id == w.IssuedByUserId)?.Username
                    : null,
                w.Reason,
                w.Severity,
                w.IssuedAt,
                w.ExpiresAt,
                w.IsActive && !w.IsExpired))
            .ToList();
    }

    public async Task<MemberWarningDto> IssueWarningAsync(IssueWarningRequestDto request, int actorUserId,
        CancellationToken cancellationToken)
    {
        var validationResult = await _issueWarningValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new Exceptions.ValidationException(validationResult.ToDictionary());
        }

        var member = await GetMemberOrThrowAsync(request.MemberId, cancellationToken);

        var expiresAt = request.ExpiresAt;
        if (request.BanForDays.HasValue)
        {
            expiresAt = _clock.UtcNow.AddDays(request.BanForDays.Value);
            member.SetStatus(MemberStatus.Banned);
        }
        else if (request.MuteForDays.HasValue)
        {
            expiresAt = _clock.UtcNow.AddDays(request.MuteForDays.Value);
            member.SetStatus(MemberStatus.Muted);
        }

        var warning = new MemberWarning(member.Id, actorUserId, request.Reason, request.Severity, expiresAt);
        _warnings.Add(warning);
        _members.Update(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(actorUserId, AuditAction.Create, AuditEntityType.MemberWarning,
            warning.Id.ToString(), newValue: request.Reason, cancellationToken: cancellationToken);

        return new MemberWarningDto(warning.Id, warning.MemberId, warning.IssuedByUserId,
            null, warning.Reason, warning.Severity, warning.IssuedAt, warning.ExpiresAt, warning.IsActive);
    }

    public async Task DeactivateWarningAsync(int warningId, CancellationToken cancellationToken)
    {
        var warning = await _warnings.GetByIdAsync(warningId, cancellationToken)
                      ?? throw new NotFoundException($"Предупреждение {warningId} не найдено.");
        warning.Deactivate();
        _warnings.Update(warning);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MemberProfileHistoryDto>> GetProfileHistoryAsync(int memberId, int limit,
        CancellationToken cancellationToken)
    {
        var member = await GetMemberOrThrowAsync(memberId, cancellationToken);
        var history = await _profileHistory.ListAsync(x => x.MemberId == member.Id, cancellationToken);

        return history
            .OrderByDescending(x => x.ChangedAt)
            .Take(limit)
            .Select(x => new MemberProfileHistoryDto(x.Id, x.MemberId, x.Field, x.OldValue, x.NewValue, x.ChangedAt))
            .ToList();
    }

    public async Task<int> ExpireOverdueWarningsAsync(CancellationToken cancellationToken)
    {
        var overdueWarnings = await _warnings.ListAsync(
            x => x.IsActive && x.ExpiresAt.HasValue && x.ExpiresAt.Value <= _clock.UtcNow,
            cancellationToken);

        if (overdueWarnings.Count == 0)
        {
            return 0;
        }

        var memberIds = overdueWarnings.Select(x => x.MemberId).ToHashSet();
        var members = await _members.ListAsync(x => memberIds.Contains(x.Id), cancellationToken);

        foreach (var warning in overdueWarnings)
        {
            warning.Deactivate();
            _warnings.Update(warning);
        }

        foreach (var member in members)
        {
            member.SetStatus(MemberStatus.Active);
            _members.Update(member);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return overdueWarnings.Count;
    }

    /// <summary>
    /// Обновляет ник/аватар участника из Steam и пишет историю изменений профиля.
    /// Вызывается из фоновой джобы сбора данных.
    /// </summary>
    public async Task TrackProfileChangesAsync(IReadOnlyList<Contracts.Steam.SteamPlayerSummaryDto> summaries,
        CancellationToken cancellationToken)
    {
        if (summaries.Count == 0)
        {
            return;
        }

        var steamIds = summaries.Select(x => x.SteamId64).ToHashSet();
        var members = await _members.ListAsync(m => steamIds.Contains(m.SteamId64), cancellationToken);
        if (members.Count == 0)
        {
            return;
        }

        var memberById = members.ToDictionary(m => m.SteamId64);
        var users = await _users.ListAsync(u => steamIds.Contains(u.SteamId64), cancellationToken);
        var userById = users.ToDictionary(u => u.SteamId64);

        foreach (var summary in summaries)
        {
            if (!memberById.TryGetValue(summary.SteamId64, out var member) ||
                !userById.TryGetValue(summary.SteamId64, out var user))
            {
                continue;
            }

            var newNickname = string.IsNullOrWhiteSpace(summary.Nickname) ? user.Username : summary.Nickname;
            var newAvatar = string.IsNullOrWhiteSpace(summary.AvatarUrl) ? user.AvatarUrl : summary.AvatarUrl;

            if (newNickname != user.Username)
            {
                _profileHistory.Add(new MemberProfileHistory(member.Id, "Nickname", user.Username, newNickname));
            }

            if (newAvatar != user.AvatarUrl)
            {
                _profileHistory.Add(new MemberProfileHistory(member.Id, "Avatar", user.AvatarUrl, newAvatar));
            }

            user.UpdateIdentity(newNickname, newAvatar);
            _users.Update(user);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<ClanMember> GetMemberOrThrowAsync(int id, CancellationToken cancellationToken)
    {
        return await _members.GetByIdAsync(id, cancellationToken)
               ?? throw new NotFoundException($"Участник клана {id} не найден.");
    }

    private static ClanMemberDto MapToDto(ClanMember member, User? user, PlayerStatusSnapshot? lastStatus,
        long minutesPlayed)
    {
        return new ClanMemberDto(
            member.Id,
            member.SteamId64,
            user?.Username ?? $"Player_{member.SteamId64[^4..]}",
            user?.AvatarUrl ?? string.Empty,
            lastStatus is { IsOnline: true },
            lastStatus?.GameId,
            lastStatus?.GameName,
            member.InternalRank,
            member.Status,
            member.JoinedAt,
            minutesPlayed,
            lastStatus?.Timestamp);
    }
}