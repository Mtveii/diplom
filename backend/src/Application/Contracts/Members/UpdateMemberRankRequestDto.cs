using SteamAdminPanel.Domain.Enums;

namespace SteamAdminPanel.Application.Contracts.Members;

public sealed record UpdateMemberRankRequestDto(InternalRank InternalRank);