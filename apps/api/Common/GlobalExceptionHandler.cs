using api.Models;
using Microsoft.AspNetCore.Diagnostics;

namespace api.Common;

/// <summary>
/// Last resort for exceptions no controller or service caught: logs them with their stack trace on the server, and
/// answers a generic 500 so the client never sees the exception details (not even the development error page).
/// </summary>
/// <param name="logger">Logger receiving the unhandled exceptions.</param>
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    /// <summary>
    /// Message returned to the client, in an <see cref="ErrorResponse"/> like the other API errors.
    /// </summary>
    public const string Message = "An unexpected error occurred. Please try again later.";

    /// <inheritdoc />
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled exception on {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(new ErrorResponse(Message), cancellationToken);
        return true;
    }
}
