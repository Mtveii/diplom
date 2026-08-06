using SteamAdminPanel.Application.Contracts.Common;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Services;

public sealed class AuditService : IAuditService
{
    private readonly IRepository<AdminActionLog> _logs;
    private readonly IUnitOfWork _unitOfWork;

    public AuditService(IRepository<AdminActionLog> logs, IUnitOfWork unitOfWork)
    {
        _logs = logs;
        _unitOfWork = unitOfWork;
    }

    public async Task LogAsync(int? userId, AuditAction action, AuditEntityType entityType, string? entityId = null,
        string? oldValue = null, string? newValue = null, string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        _logs.Add(new AdminActionLog(userId, action, entityType, entityId, oldValue, newValue, ipAddress));
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResultDto<AdminActionLog>> GetLogsAsync(int page, int pageSize,
        AuditEntityType? entityType = null, CancellationToken cancellationToken = default)
    {
        var logs = await _logs.ListAsync(
            entityType.HasValue ? x => x.EntityType == entityType.Value : null,
            cancellationToken);

        var ordered = logs.OrderByDescending(x => x.Timestamp).ToList();
        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new PagedResultDto<AdminActionLog>(items, ordered.Count, page, pageSize);
    }
}