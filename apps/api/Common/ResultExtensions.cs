using api.Models;
using Microsoft.AspNetCore.Mvc;

namespace api.Common;

/// <summary>
/// Helpers turning a <see cref="Result{T}"/> into an HTTP response, so controller actions stay one-liners whose
/// signature tells the type of their 200 body (<see cref="ActionResult{TValue}"/>).
/// </summary>
public static class ResultExtensions
{
    /// <summary>
    /// Converts a <see cref="Result{T}"/> into the matching HTTP response: 200 with the value, or the error response of
    /// its <see cref="Error"/> (see <see cref="ToActionResult(Error)"/>).
    /// </summary>
    /// <param name="result">Outcome of a service.</param>
    /// <returns>The response of the action, typed with its 200 body.</returns>
    public static ActionResult<T> ToActionResult<T>(this Result<T> result)
        => result.Error is null ? new OkObjectResult(result.Value) : result.Error.ToActionResult();

    /// <summary>
    /// Converts an <see cref="Error"/> into the matching HTTP response: the status code of its <see cref="ErrorType"/>
    /// (400, 401, 403, 404, 409, 503) with an <see cref="ErrorResponse"/> holding its message.
    /// </summary>
    /// <param name="error">Reason of the failure.</param>
    /// <returns>The error response.</returns>
    public static ActionResult ToActionResult(this Error error)
    {
        ErrorResponse body = new(error.Message);
        return error.Type switch
        {
            ErrorType.NotFound => new NotFoundObjectResult(body),
            ErrorType.Unauthorized => new UnauthorizedObjectResult(body),
            ErrorType.Forbidden => new ObjectResult(body) { StatusCode = StatusCodes.Status403Forbidden },
            ErrorType.Validation => new BadRequestObjectResult(body),
            ErrorType.Conflict => new ConflictObjectResult(body),
            _ => new ObjectResult(body) { StatusCode = StatusCodes.Status503ServiceUnavailable }
        };
    }
}
