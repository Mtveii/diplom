using SteamAdminPanel.Application.Interfaces;

namespace SteamAdminPanel.Infrastructure.BackgroundJobs;

/// <summary>Раз в день: деактивация истёкших варнингов и снятие банов/мутов.</summary>
public sealed class WarningExpiryJob
{
    private readonly IClanMemberService _clanMemberService;

    public WarningExpiryJob(IClanMemberService clanMemberService)
    {
        _clanMemberService = clanMemberService;
    }

    public async Task RunAsync()
    {
        await _clanMemberService.ExpireOverdueWarningsAsync(CancellationToken.None);
    }
}