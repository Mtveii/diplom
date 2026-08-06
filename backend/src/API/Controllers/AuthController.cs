using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SteamAdminPanel.Application.Contracts.Auth;
using SteamAdminPanel.Application.Contracts.Users;
using SteamAdminPanel.Application.Interfaces;
using SteamAdminPanel.Application.Ports;
using SteamAdminPanel.Domain.Entities;

namespace SteamAdminPanel.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private const string RefreshTokenCookieName = "refresh_token";

    private readonly IAuthService _authService;
    private readonly IUserService _userService;
    private readonly IRepository<User> _users;

    public AuthController(IAuthService authService, IUserService userService, IRepository<User> users)
    {
        _authService = authService;
        _userService = userService;
        _users = users;
    }

    /// <summary>URL для входа через Steam OpenID.</summary>
    [HttpGet("steam-url")]
    [AllowAnonymous]
    public async Task<ActionResult<SteamLoginUrlDto>> GetSteamLoginUrl([FromQuery] string? returnUrl = null)
    {
        var configuredReturnUrl = returnUrl ?? $"{Request.Scheme}://{Request.Host}/api/auth/steam/callback";
        var result = await _authService.GetSteamLoginUrlAsync(configuredReturnUrl, HttpContext.RequestAborted);
        return Ok(result);
    }

    /// <summary>Callback Steam OpenID — создаёт/входит в аккаунт и выдаёт токены.</summary>
    [HttpGet("steam/callback")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> SteamCallback()
    {
        var query = Request.Query
            .ToDictionary(x => x.Key, x => x.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        var result = await _authService.HandleSteamCallbackAsync(query, GetIpAddress(),
            HttpContext.RequestAborted);
        SetRefreshTokenCookie(result);
        return Ok(result);
    }

    /// <summary>Резервный вход админа по логину/паролю.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> AdminLogin([FromBody] AdminLoginRequestDto request)
    {
        var result = await _authService.AdminLoginAsync(request, GetIpAddress(), HttpContext.RequestAborted);
        SetRefreshTokenCookie(result);
        return Ok(result);
    }

    /// <summary>Обновление токенов через refresh token из httpOnly cookie.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> Refresh()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];
        var result = await _authService.RefreshAsync(refreshToken ?? string.Empty, HttpContext.RequestAborted);
        SetRefreshTokenCookie(result);
        return Ok(result);
    }

    /// <summary>Выход: отзыв refresh token и очистка cookie.</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];
        if (refreshToken is not null)
        {
            await _authService.RevokeAsync(refreshToken, HttpContext.RequestAborted);
        }

        Response.Cookies.Delete(RefreshTokenCookieName);
        return NoContent();
    }

    /// <summary>Текущий пользователь (для фронтенда).</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                               ?? throw new Application.Exceptions.UnauthorizedException("Не авторизован."));
        var result = await _userService.GetByIdAsync(userId, HttpContext.RequestAborted);
        return Ok(result);
    }

    private void SetRefreshTokenCookie(LoginResponseDto result)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        };

        Response.Cookies.Append(RefreshTokenCookieName, result.RefreshToken, cookieOptions);
    }

    private string? GetIpAddress()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}