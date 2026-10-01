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
}
