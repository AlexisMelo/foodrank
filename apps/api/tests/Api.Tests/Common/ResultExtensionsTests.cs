using api.Common;
using api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Tests.Common;

/// <summary>
/// Tests the mapping of a <see cref="Result{T}"/> and of an <see cref="Error"/> to an HTTP response.
/// </summary>
public class ResultExtensionsTests
{
    /// <summary>
    /// A success becomes a 200 holding the value.
    /// </summary>
    [Fact]
    public void ToActionResult_Success_Returns200WithValue()
    {
        ActionResult<string> response = Result<string>.Success("ok").ToActionResult();

        OkObjectResult ok = Assert.IsType<OkObjectResult>(response.Result);
        Assert.Equal("ok", ok.Value);
    }

    /// <summary>
    /// A NotFound error becomes a 404 holding its message in an <see cref="ErrorResponse"/>.
    /// </summary>
    [Fact]
    public void ToActionResult_NotFound_Returns404WithMessage()
    {
        ActionResult<string> response = Result<string>.Failure(new Error(ErrorType.NotFound, "missing")).ToActionResult();

        NotFoundObjectResult notFound = Assert.IsType<NotFoundObjectResult>(response.Result);
        Assert.Equal(new ErrorResponse("missing"), notFound.Value);
    }

    /// <summary>
    /// An Unavailable error becomes a 503.
    /// </summary>
    [Fact]
    public void ToActionResult_Unavailable_Returns503()
    {
        ActionResult<string> response = Result<string>.Failure(new Error(ErrorType.Unavailable, "down")).ToActionResult();

        ObjectResult result = Assert.IsType<ObjectResult>(response.Result);
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
        ActionResult<string> response = Result<string>.Failure(new Error(type, "error")).ToActionResult();

        ObjectResult result = Assert.IsAssignableFrom<ObjectResult>(response.Result);
        Assert.Equal(expectedStatus, result.StatusCode);
    }

    /// <summary>
    /// An error alone (for the actions answering no body on success) gives the same response as a failed result.
    /// </summary>
    [Fact]
    public void ToActionResult_Error_ReturnsStatusAndMessage()
    {
        ActionResult response = new Error(ErrorType.Conflict, "taken").ToActionResult();

        ConflictObjectResult conflict = Assert.IsType<ConflictObjectResult>(response);
        Assert.Equal(new ErrorResponse("taken"), conflict.Value);
    }
}
