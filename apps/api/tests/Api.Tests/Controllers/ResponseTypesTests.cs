using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.Extensions.DependencyInjection;

namespace Api.Tests.Controllers;

/// <summary>
/// Checks that every endpoint declares the type of its 200 body in its signature (<c>ActionResult&lt;T&gt;</c>), as
/// read by ASP.NET Core to describe the API (OpenAPI document): an <c>IActionResult</c> would hide it.
/// </summary>
public class ResponseTypesTests : IDisposable
{
    /// <summary>
    /// In-memory API, whose endpoints are described.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Disposes the in-memory API.
    /// </summary>
    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// Only the account endpoints answering an empty 200 (the session is a cookie) declare no body type.
    /// </summary>
    [Fact]
    public void Endpoints_DeclareTheTypeOfTheir200Body()
    {
        IEnumerable<ApiDescription> endpoints = _factory.Services
            .GetRequiredService<IApiDescriptionGroupCollectionProvider>()
            .ApiDescriptionGroups.Items
            .SelectMany(group => group.Items);

        List<string> withoutBodyType = endpoints
            .Where(endpoint => !endpoint.SupportedResponseTypes.Any(response =>
                response.StatusCode == 200 && response.Type is not null && response.Type != typeof(void)))
            .Select(endpoint => $"{endpoint.HttpMethod} {endpoint.RelativePath}")
            .Order()
            .ToList();

        Assert.Equal(
        [
            "POST api/auth/delete-account",
            "POST api/auth/forgot-password",
            "POST api/auth/login",
            "POST api/auth/logout",
            "POST api/auth/reset-password",
            "POST api/auth/signup"
        ], withoutBodyType);
    }
}
