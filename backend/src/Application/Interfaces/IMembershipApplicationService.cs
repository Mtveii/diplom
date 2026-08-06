using SteamAdminPanel.Application.Contracts.Members;

namespace SteamAdminPanel.Application.Interfaces;

public interface IMembershipApplicationService
{
    Task<IReadOnlyList<MembershipApplicationDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<MembershipApplicationDto> SubmitAsync(SubmitApplicationRequestDto request,
        CancellationToken cancellationToken = default);

    Task<MembershipApplicationDto> ReviewAsync(int id, ReviewApplicationRequestDto request, int reviewerUserId,
        CancellationToken cancellationToken = default);
}