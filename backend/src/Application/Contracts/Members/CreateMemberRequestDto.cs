using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Members;

public sealed record CreateMemberRequestDto(string SteamId64, InternalRank InternalRank = InternalRank.Recruit);