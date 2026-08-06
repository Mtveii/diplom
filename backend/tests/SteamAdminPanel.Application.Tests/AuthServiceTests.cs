using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SteamAdminPanel.Application.Contracts.Auth;
using SteamAdminPanel.Application.Exceptions;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Application.Services;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;
using Xunit;

namespace SteamAdminPanel.Application.Tests;

public sealed class AuthServiceTests
{
    private static readonly DateTime Now = new(2026, 1, 10, 12, 0, 0, DateTimeKind.Utc);

    private readonly IRepository<User> _users = Substitute.For<IRepository<User>>();
    private readonly IRepository<RefreshToken> _refreshTokens = Substitute.For<IRepository<RefreshToken>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ISteamOpenIdClient _steamOpenId = Substitute.For<ISteamOpenIdClient>();
    private readonly ITokenGenerator _tokenGenerator = Substitute.For<ITokenGenerator>();
    private readonly IPasswordHasher _passwordHasher = Substitute.For<IPasswordHasher>();
    private readonly IClock _clock = Substitute.For<IClock>();
    private readonly IAuditService _auditService = Substitute.For<IAuditService>();
    private readonly IValidator<AdminLoginRequestDto> _validator = Substitute.For<IValidator<AdminLoginRequestDto>>();

    private AuthService CreateService()
    {
        _clock.UtcNow.Returns(Now);
        _tokenGenerator.GetRefreshTokenExpiry().Returns(Now.AddDays(7));
        _tokenGenerator.GetAccessTokenExpiry().Returns(Now.AddMinutes(15));
        _tokenGenerator.GenerateAccessToken(Arg.Any<User>()).Returns("access-token");
        _tokenGenerator.GenerateRefreshToken().Returns("refresh-token");
        _tokenGenerator.HashToken(Arg.Any<string>()).Returns("hashed-token");
        _tokenGenerator.GetRefreshTokenExpiry().Returns(Now.AddDays(7));

        return new AuthService(
            _users,
            _refreshTokens,
            _unitOfWork,
            _steamOpenId,
            _tokenGenerator,
            _passwordHasher,
            _clock,
            _auditService,
            _validator,
            Substitute.For<ILogger<AuthService>>());
    }

    [Fact]
    public async Task AdminLoginAsync_WithValidCredentials_IssuesTokensAndLogsAudit()
    {
        _validator.ValidateAsync(Arg.Any<AdminLoginRequestDto>(), Arg.Any<CancellationToken>())
            .Returns(new ValidationResult());
        var admin = new User("76561198212420000", "Chief", string.Empty, UserRole.SuperAdmin);
        admin.SetAdminCredentials("admin", "stored-hash");
        _users.FirstOrDefaultAsync(Arg.Any<System.Linq.Expressions.Expression<Func<User, bool>>>(), Arg.Any<CancellationToken>())
            .Returns(admin);
        _passwordHasher.Verify("secret", "stored-hash").Returns(true);

        var service = CreateService();
        var result = await service.AdminLoginAsync(new AdminLoginRequestDto("admin", "secret"), null,
            CancellationToken.None);

        result.AccessToken.Should().Be("access-token");
        result.RefreshToken.Should().Be("refresh-token");
        result.Username.Should().Be("Chief");
        result.Role.Should().Be(UserRole.SuperAdmin);
        admin.LastLoginAt.Should().Be(Now);
        _refreshTokens.Received(1).Add(Arg.Any<RefreshToken>());
        await _auditService.Received(1).LogAsync(admin.Id, AuditAction.Login, AuditEntityType.User, admin.Id.ToString(),
            Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AdminLoginAsync_WithWrongPassword_ThrowsUnauthorized()
    {
        _validator.ValidateAsync(Arg.Any<AdminLoginRequestDto>(), Arg.Any<CancellationToken>())
            .Returns(new ValidationResult());
        var admin = new User("76561198212420000", "Chief", string.Empty, UserRole.SuperAdmin);
        admin.SetAdminCredentials("admin", "stored-hash");
        _users.FirstOrDefaultAsync(Arg.Any<System.Linq.Expressions.Expression<Func<User, bool>>>(), Arg.Any<CancellationToken>())
            .Returns(admin);
        _passwordHasher.Verify("wrong", "stored-hash").Returns(false);

        var service = CreateService();
        var act = async () => await service.AdminLoginAsync(new AdminLoginRequestDto("admin", "wrong"), null,
            CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedException>();
    }

    [Fact]
    public async Task RefreshAsync_WithActiveToken_RevokesOldAndIssuesNewPair()
    {
        var storedToken = new RefreshToken(42, "hashed-token", DateTime.UtcNow.AddDays(30));
        _refreshTokens.FirstOrDefaultAsync(Arg.Any<System.Linq.Expressions.Expression<Func<RefreshToken, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns(storedToken);
        var user = new User("76561198212420000", "Chief", string.Empty, UserRole.Moderator);
        _users.GetByIdAsync(42, Arg.Any<CancellationToken>()).Returns(user);

        var service = CreateService();
        var result = await service.RefreshAsync("refresh-token", CancellationToken.None);

        result.AccessToken.Should().Be("access-token");
        storedToken.IsActive.Should().BeFalse();
        _refreshTokens.Received(1).Update(storedToken);
        await _unitOfWork.Received(2).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RefreshAsync_WithUnknownToken_ThrowsUnauthorized()
    {
        _refreshTokens.FirstOrDefaultAsync(Arg.Any<System.Linq.Expressions.Expression<Func<RefreshToken, bool>>>(),
                Arg.Any<CancellationToken>())
            .Returns((RefreshToken?)null);

        var service = CreateService();
        var act = async () => await service.RefreshAsync("unknown-token", CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedException>();
    }
}