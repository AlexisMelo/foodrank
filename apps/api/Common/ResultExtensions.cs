using Microsoft.AspNetCore.Mvc;

namespace api.Common;

public static class ResultExtensions
{
    /// <summary>
    /// Converts a <see cref="Result{T}"/> into the matching HTTP response: 200 with the value, 404 or 503 with the error message.
    /// </summary>
    public static IActionResult ToActionResult<T>(this Result<T> result) => result.Error?.Type switch
    {
        null => new OkObjectResult(result.Value),
        ErrorType.NotFound => new NotFoundObjectResult(new { error = result.Error.Message }),
        _ => new ObjectResult(new { error = result.Error.Message }) { StatusCode = StatusCodes.Status503ServiceUnavailable }
    };
}
