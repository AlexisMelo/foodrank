using api.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Tests.Common;

/// <summary>
/// Tests the mapping of a <see cref="Result{T}"/> to an HTTP response.
/// </summary>
public class ResultExtensionsTests
{
    /// <summary>
    /// A success becomes a 200 holding the value.
    /// </summary>
    [Fact]
    public void ToActionResult_Success_Returns200WithValue()
    {
        IActionResult response = Result<string>.Success("ok").ToActionResult();

        OkObjectResult ok = Assert.IsType<OkObjectResult>(response);
        Assert.Equal("ok", ok.Value);
    }

    /// <summary>
    /// A NotFound error becomes a 404.
    /// </summary>
    [Fact]
    public void ToActionResult_NotFound_Returns404()
    {
        IActionResult response = Result<string>.Failure(new Error(ErrorType.NotFound, "missing")).ToActionResult();

        Assert.IsType<NotFoundObjectResult>(response);
    }

    /// <summary>
    /// An Unavailable error becomes a 503.
    /// </summary>
    [Fact]
    public void ToActionResult_Unavailable_Returns503()
    {
        IActionResult response = Result<string>.Failure(new Error(ErrorType.Unavailable, "down")).ToActionResult();

        ObjectResult result = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, result.StatusCode);
    }

    /// <summary>
    /// Unauthorized, Forbidden, Validation and Conflict errors become a 401, 403, 400 and 409.
    /// </summary>
    [Theory]
    [InlineData(ErrorType.Unauthorized, StatusCodes.Status401Unauthorized)]
    [InlineData(ErrorType.Forbidden, StatusCodes.Status403Forbidden)]
    [InlineData(ErrorType.Validation, StatusCodes.Status400BadRequest)]
    [InlineData(ErrorType.Conflict, StatusCodes.Status409Conflict)]
    public void ToActionResult_ClientErrors_ReturnMatchingStatus(ErrorType type, int expectedStatus)
    {
        IActionResult response = Result<string>.Failure(new Error(type, "error")).ToActionResult();

        ObjectResult result = Assert.IsAssignableFrom<ObjectResult>(response);
        Assert.Equal(expectedStatus, result.StatusCode);
    }
}
