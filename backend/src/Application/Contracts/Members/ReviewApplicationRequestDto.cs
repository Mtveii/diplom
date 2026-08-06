using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Members;

public sealed record ReviewApplicationRequestDto(MembershipApplicationStatus Decision, string? Comment);