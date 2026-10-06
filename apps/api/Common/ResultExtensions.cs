using Microsoft.AspNetCore.Mvc;

namespace api.Common;

/// <summary>
/// Helpers turning a <see cref="Result{T}"/> into an HTTP response, so controller actions stay one-liners.
/// </summary>
public static class ResultExtensions
{
    /// <summary>
    /// Converts a <see cref="Result{T}"/> into the matching HTTP response: 200 with the value, or the status code
    /// of the <see cref="ErrorType"/> (400, 401, 404, 409, 503) with the error message.
    /// </summary>
    public static IActionResult ToActionResult<T>(this Result<T> result) => result.Error?.Type switch
    {
        null => new OkObjectResult(result.Value),
        ErrorType.NotFound => new NotFoundObjectResult(new { error = result.Error.Message }),
        ErrorType.Unauthorized => new UnauthorizedObjectResult(new { error = result.Error.Message }),
        ErrorType.Validation => new BadRequestObjectResult(new { error = result.Error.Message }),
        ErrorType.Conflict => new ConflictObjectResult(new { error = result.Error.Message }),
        _ => new ObjectResult(new { error = result.Error.Message }) { StatusCode = StatusCodes.Status503ServiceUnavailable }
    };
}
