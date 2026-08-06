using SteamAdminPanel.Application.Contracts.Common;
using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Interfaces;

public interface IAuditService
{
    Task LogAsync(int? userId, AuditAction action, AuditEntityType entityType, string? entityId = null,
        string? oldValue = null, string? newValue = null, string? ipAddress = null,
        CancellationToken cancellationToken = default);

    Task<PagedResultDto<Domain.Entities.AdminActionLog>> GetLogsAsync(int page, int pageSize,
        AuditEntityType? entityType = null, CancellationToken cancellationToken = default);
}