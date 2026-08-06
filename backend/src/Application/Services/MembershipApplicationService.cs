using FluentValidation;
using SteamAdminPanel.Application.Contracts.Members;
using SteamAdminPanel.Application.Exceptions;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Services;

public sealed class MembershipApplicationService : IMembershipApplicationService
{
    private readonly IRepository<MembershipApplication> _applications;
    private readonly IRepository<ClanMember> _members;
    private readonly IRepository<User> _users;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly IValidator<SubmitApplicationRequestDto> _submitValidator;
    private readonly IValidator<ReviewApplicationRequestDto> _reviewValidator;

    public MembershipApplicationService(
        IRepository<MembershipApplication> applications,
        IRepository<ClanMember> members,
        IRepository<User> users,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        IValidator<SubmitApplicationRequestDto> submitValidator,
        IValidator<ReviewApplicationRequestDto> reviewValidator)
    {
        _applications = applications;
        _members = members;
        _users = users;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _submitValidator = submitValidator;
        _reviewValidator = reviewValidator;
    }

    public async Task<IReadOnlyList<MembershipApplicationDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var applications = await _applications.ListAsync(null, cancellationToken);
        var steamIds = applications.Select(x => x.SteamId64).ToHashSet();
        var users = steamIds.Count == 0
            ? Array.Empty<User>()
            : await _users.ListAsync(u => steamIds.Contains(u.SteamId64), cancellationToken);

        return applications
            .OrderByDescending(x => x.CreatedAt)
            .Select(application => MapToDto(application,
                users.FirstOrDefault(u => u.SteamId64 == application.SteamId64)))
            .ToList();
    }

    public async Task<MembershipApplicationDto> SubmitAsync(SubmitApplicationRequestDto request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _submitValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new Exceptions.ValidationException(validationResult.ToDictionary());
        }

        var isMember = await _members.AnyAsync(x => x.SteamId64 == request.SteamId64, cancellationToken);
        if (isMember)
        {
            throw new ConflictException("Вы уже состоите в клане.");
        }

        var hasPending = await _applications.AnyAsync(
            x => x.SteamId64 == request.SteamId64 && x.Status == MembershipApplicationStatus.Pending,
            cancellationToken);
        if (hasPending)
        {
            throw new ConflictException("Заявка уже отправлена и ожидает рассмотрения.");
        }

        var application = new MembershipApplication(request.SteamId64);
        _applications.Add(application);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var user = await _users.FirstOrDefaultAsync(x => x.SteamId64 == request.SteamId64, cancellationToken);
        return MapToDto(application, user);
    }

    public async Task<MembershipApplicationDto> ReviewAsync(int id, ReviewApplicationRequestDto request,
        int reviewerUserId, CancellationToken cancellationToken)
    {
        var validationResult = await _reviewValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new Exceptions.ValidationException(validationResult.ToDictionary());
        }

        var application = await _applications.GetByIdAsync(id, cancellationToken)
                          ?? throw new NotFoundException($"Заявка {id} не найдена.");
        if (application.Status != MembershipApplicationStatus.Pending)
        {
            throw new ConflictException("Заявка уже рассмотрена.");
        }

        var auditAction = request.Decision == MembershipApplicationStatus.Approved
            ? AuditAction.ApplicationApprove
            : AuditAction.ApplicationReject;

        if (request.Decision == MembershipApplicationStatus.Approved)
        {
            application.Approve(reviewerUserId, request.Comment);
            _members.Add(new ClanMember(application.SteamId64, InternalRank.Recruit));
        }
        else
        {
            application.Reject(reviewerUserId, request.Comment);
        }

        _applications.Update(application);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(reviewerUserId, auditAction, AuditEntityType.MembershipApplication,
            id.ToString(), newValue: request.Decision.ToString(), cancellationToken: cancellationToken);

        var user = await _users.FirstOrDefaultAsync(x => x.SteamId64 == application.SteamId64, cancellationToken);
        return MapToDto(application, user);
    }

    private static MembershipApplicationDto MapToDto(MembershipApplication application, User? user)
    {
        return new MembershipApplicationDto(
            application.Id,
            application.SteamId64,
            user?.Username,
            user?.AvatarUrl,
            application.Status,
            application.ReviewedByUserId,
            application.Comment,
            application.CreatedAt,
            application.ReviewedAt);
    }
}