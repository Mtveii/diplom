using System.Net;
using System.Text.Json;
using SteamAdminPanel.Application.Exceptions;

namespace SteamAdminPanel.Api.Middleware;

/// <summary>
/// Глобальный обработчик исключений: маппит кастомные исключения на HTTP-коды,
/// остальное — 500 с логированием. Никакие исключения не проглатываются.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, errors) = exception switch
        {
            NotFoundException notFound => (HttpStatusCode.NotFound, notFound.Message, null),
            ValidationException validation => (HttpStatusCode.BadRequest, validation.Message, validation.Errors),
            UnauthorizedException unauthorized => (HttpStatusCode.Unauthorized, unauthorized.Message, null),
            ConflictException conflict => (HttpStatusCode.Conflict, conflict.Message, null),
            _ => (HttpStatusCode.InternalServerError, "Внутренняя ошибка сервера.", null)
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Необработанное исключение на {Path}", context.Request.Path);
        }
        else
        {
            _logger.LogWarning(exception, "Обработанное исключение на {Path}", context.Request.Path);
        }

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/problem+json";

        var body = JsonSerializer.Serialize(new
        {
            type = $"https://httpstatuses.com/{(int)statusCode}",
            title,
            status = (int)statusCode,
            errors
        });

        await context.Response.WriteAsync(body);
    }
}