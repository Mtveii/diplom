namespace SteamAdminPanel.Domain.Enums;

public enum AuditAction
{
    Login = 0,
    Logout = 1,
    Create = 2,
    Update = 3,
    Delete = 4,
    RoleChange = 5,
    StatusChange = 6,
    ApplicationApprove = 7,
    ApplicationReject = 8,
    AlertTriggered = 9
}