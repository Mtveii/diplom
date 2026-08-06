using SteamAdminPanel.Application.Contracts.Auth;
using SteamAdminPanel.Application.Exceptions;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;
using SteamAdminPanel.Domain.Enums;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace SteamAdminPanel.Application.Services;

public sealed class AuthService : IAuthService
{
    private readonly IRepository<User> _users;
    private readonly IRepository<RefreshToken> _refreshTokens;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISteamOpenIdClient _steamOpenId;
    private readonly ITokenGenerator _tokenGenerator;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IClock _clock;
    private readonly IAuditService _auditService;
    private readonly IValidator<AdminLoginRequestDto> _adminLoginValidator;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IRepository<User> users,
        IRepository<RefreshToken> refreshTokens,
        IUnitOfWork unitOfWork,
        ISteamOpenIdClient steamOpenId,
        ITokenGenerator tokenGenerator,
        IPasswordHasher passwordHasher,
        IClock clock,
        IAuditService auditService,
        IValidator<AdminLoginRequestDto> adminLoginValidator,
        ILogger<AuthService> logger)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _unitOfWork = unitOfWork;
        _steamOpenId = steamOpenId;
        _tokenGenerator = tokenGenerator;
        _passwordHasher = passwordHasher;
        _clock = clock;
        _auditService = auditService;
        _adminLoginValidator = adminLoginValidator;
        _logger = logger;
    }

    public Task<SteamLoginUrlDto> GetSteamLoginUrlAsync(string returnUrl, CancellationToken cancellationToken)
    {
        var url = _steamOpenId.BuildLoginUrl(returnUrl);
        return Task.FromResult(new SteamLoginUrlDto(url));
    }

    public async Task<LoginResponseDto> HandleSteamCallbackAsync(IReadOnlyDictionary<string, string> query,
        string? ipAddress, CancellationToken cancellationToken)
    {
        var steamId64 = await _steamOpenId.ValidateCallbackAndGetSteamIdAsync(query, cancellationToken);
        if (steamId64 is null)
        {
            throw new UnauthorizedException("Не удалось подтвердить личность через Steam OpenID.");
        }

        var user = await _users.FirstOrDefaultAsync(x => x.SteamId64 == steamId64, cancellationToken);
        if (user is null)
        {
            user = await CreateUserFromSteamAsync(steamId64, cancellationToken);
        }

        var response = await IssueTokensAsync(user, ipAddress, cancellationToken);
        _logger.LogInformation("Пользователь {Username} вошёл через Steam OpenID", user.Username);
        return response;
    }

    public async Task<LoginResponseDto> AdminLoginAsync(AdminLoginRequestDto request, string? ipAddress,
        CancellationToken cancellationToken)
    {
        var validationResult = await _adminLoginValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new Exceptions.ValidationException(validationResult.ToDictionary());
        }

        var user = await _users.FirstOrDefaultAsync(x => x.AdminUsername == request.Username, cancellationToken);
        if (user is null || user.PasswordHash is null ||
            !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedException("Неверный логин или пароль.");
        }

        var response = await IssueTokensAsync(user, ipAddress, cancellationToken);
        _logger.LogInformation("Админ {Username} вошёл по логину/паролю", user.AdminUsername);
        return response;
    }

    public async Task<LoginResponseDto> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new UnauthorizedException("Refresh token отсутствует.");
        }

        var tokenHash = _tokenGenerator.HashToken(refreshToken);
        var storedToken = await _refreshTokens.FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (storedToken is null || !storedToken.IsActive)
        {
            throw new UnauthorizedException("Refresh token недействителен или истёк.");
        }

        var user = await _users.GetByIdAsync(storedToken.UserId, cancellationToken)
                   ?? throw new UnauthorizedException("Пользователь не найден.");

        storedToken.Revoke(_clock.UtcNow);
        _refreshTokens.Update(storedToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var tokens = await IssueTokensAsync(user, null, cancellationToken);
        _logger.LogInformation("Токен обновлён для пользователя {Username}", user.Username);
        return tokens;
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var tokenHash = _tokenGenerator.HashToken(refreshToken);
        var storedToken = await _refreshTokens.FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);
        if (storedToken is null)
        {
            return;
        }

        storedToken.Revoke(_clock.UtcNow);
        _refreshTokens.Update(storedToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<User> CreateUserFromSteamAsync(string steamId64, CancellationToken cancellationToken)
    {
        var user = new User(steamId64, $"Player_{steamId64[^4..]}", string.Empty, UserRole.Viewer);
        _users.Add(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return user;
    }

    private async Task<LoginResponseDto> IssueTokensAsync(User user, string? ipAddress,
        CancellationToken cancellationToken)
    {
        user.SetLastLogin(_clock.UtcNow);
        _users.Update(user);

        var refreshTokenValue = _tokenGenerator.GenerateRefreshToken();
        var refreshTokenEntity = new RefreshToken(
            user.Id,
            _tokenGenerator.HashToken(refreshTokenValue),
            _tokenGenerator.GetRefreshTokenExpiry());
        _refreshTokens.Add(refreshTokenEntity);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(user.Id, AuditAction.Login, AuditEntityType.User, user.Id.ToString(),
            ipAddress: ipAddress, cancellationToken: cancellationToken);

        return new LoginResponseDto(
            _tokenGenerator.GenerateAccessToken(user),
            refreshTokenValue,
            _tokenGenerator.GetAccessTokenExpiry(),
            user.Id,
            user.Username,
            user.AvatarUrl,
            user.Role);
    }
}